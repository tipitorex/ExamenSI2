from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, obtener_cliente_actual, obtener_super_admin_actual
from app.models.cliente import Cliente
from app.models.resena import Resena
from app.models.incidente import Incidente
from app.models.asignacion_taller import AsignacionTaller
from app.models.taller import Taller
from app.schemas.resena import ResenaCrear, ResenaRespuesta, RankingTallerItem

router = APIRouter()


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_resena(
    payload: ResenaCrear,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> ResenaRespuesta:
    """Cliente crea una reseña para un incidente finalizado."""
    incidente = db.get(Incidente, payload.incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")

    if incidente.estado != "finalizado":
        raise HTTPException(status_code=400, detail="Solo puedes calificar incidentes finalizados")

    existente = db.scalar(select(Resena).where(Resena.incidente_id == payload.incidente_id))
    if existente:
        raise HTTPException(status_code=409, detail="Ya dejaste una reseña para este incidente")

    asignacion = db.scalar(
        select(AsignacionTaller).where(AsignacionTaller.incidente_id == payload.incidente_id)
    )
    if asignacion is None:
        raise HTTPException(status_code=400, detail="No se encontró asignación para este incidente")

    resena = Resena(
        incidente_id=payload.incidente_id,
        cliente_id=cliente_actual.id,
        taller_id=asignacion.taller_id,
        tecnico_id=asignacion.tecnico_id,
        puntuacion_taller=payload.puntuacion_taller,
        puntuacion_tecnico=payload.puntuacion_tecnico,
        comentario=payload.comentario,
    )
    db.add(resena)
    db.commit()
    db.refresh(resena)

    resp = ResenaRespuesta.model_validate(resena)
    if resena.taller:
        resp.taller_nombre = resena.taller.nombre
    if resena.tecnico:
        resp.tecnico_nombre = resena.tecnico.nombre_completo
    resp.cliente_nombre = cliente_actual.nombre_completo
    return resp


@router.get("/mi-resena/{incidente_id}")
def verificar_mi_resena(
    incidente_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Cliente verifica si ya dejó una reseña para un incidente."""
    resena = db.scalar(
        select(Resena).where(
            Resena.incidente_id == incidente_id,
            Resena.cliente_id == cliente_actual.id,
        )
    )
    return {"tiene_resena": resena is not None, "resena_id": resena.id if resena else None}


@router.get("/ranking-talleres")
def ranking_talleres(
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
) -> list[RankingTallerItem]:
    """Super admin: ranking de talleres por puntuación promedio."""
    filas = (
        db.query(
            Resena.taller_id,
            func.avg(Resena.puntuacion_taller).label("promedio_taller"),
            func.avg(Resena.puntuacion_tecnico).label("promedio_tecnico"),
            func.count(Resena.id).label("total"),
        )
        .group_by(Resena.taller_id)
        .order_by(func.avg(Resena.puntuacion_taller).desc())
        .all()
    )

    resultado = []
    for fila in filas:
        taller = db.get(Taller, fila.taller_id)
        resultado.append(
            RankingTallerItem(
                taller_id=fila.taller_id,
                taller_nombre=taller.nombre if taller else f"Taller {fila.taller_id}",
                promedio_puntuacion=round(float(fila.promedio_taller), 2),
                total_resenas=fila.total,
                promedio_tecnico=round(float(fila.promedio_tecnico), 2) if fila.promedio_tecnico else None,
            )
        )
    return resultado


@router.get("/todas")
def todas_las_resenas(
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
) -> list[ResenaRespuesta]:
    """Super admin: todas las reseñas con datos de taller, técnico y cliente."""
    resenas = (
        db.scalars(
            select(Resena)
            .options(
                joinedload(Resena.taller),
                joinedload(Resena.tecnico),
                joinedload(Resena.cliente),
            )
            .order_by(Resena.creado_en.desc())
        )
        .unique()
        .all()
    )

    resultado = []
    for r in resenas:
        resp = ResenaRespuesta.model_validate(r)
        resp.taller_nombre = r.taller.nombre if r.taller else None
        resp.tecnico_nombre = r.tecnico.nombre_completo if r.tecnico else None
        resp.cliente_nombre = r.cliente.nombre_completo if r.cliente else None
        resultado.append(resp)
    return resultado
