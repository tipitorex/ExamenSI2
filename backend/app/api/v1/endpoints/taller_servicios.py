from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.models.taller_servicio import TallerServicio
from app.schemas.cotizacion import TallerServicioActualizar, TallerServicioCrear, TallerServicioRespuesta

router = APIRouter()


@router.get("")
def listar_servicios(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> list[TallerServicioRespuesta]:
    """Lista el catálogo de servicios del taller autenticado."""
    servicios = db.scalars(
        select(TallerServicio)
        .where(TallerServicio.taller_id == taller_actual.id)
        .order_by(TallerServicio.nombre)
    ).all()
    return [TallerServicioRespuesta.model_validate(s) for s in servicios]


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_servicio(
    payload: TallerServicioCrear,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TallerServicioRespuesta:
    """Agrega un nuevo servicio al catálogo del taller."""
    servicio = TallerServicio(
        taller_id=taller_actual.id,
        nombre=payload.nombre,
        descripcion=payload.descripcion,
        precio_base=payload.precio_base,
        tiempo_estimado_minutos=payload.tiempo_estimado_minutos,
    )
    db.add(servicio)
    db.commit()
    db.refresh(servicio)
    return TallerServicioRespuesta.model_validate(servicio)


@router.put("/{servicio_id}")
def actualizar_servicio(
    servicio_id: int,
    payload: TallerServicioActualizar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TallerServicioRespuesta:
    """Actualiza un servicio del catálogo del taller."""
    servicio = db.get(TallerServicio, servicio_id)
    if servicio is None or servicio.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(servicio, campo, valor)

    db.commit()
    db.refresh(servicio)
    return TallerServicioRespuesta.model_validate(servicio)


@router.delete("/{servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Response:
    """Elimina un servicio del catálogo del taller."""
    servicio = db.get(TallerServicio, servicio_id)
    if servicio is None or servicio.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    db.delete(servicio)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
