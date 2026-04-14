from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.asignacion_taller import AsignacionTaller
from app.schemas.asignacion_taller import AsignacionTallerActualizar, AsignacionTallerCrear


def obtener_asignaciones_por_taller(db: Session, taller_id: int) -> list[AsignacionTaller]:
    consulta: Select[tuple[AsignacionTaller]] = select(AsignacionTaller).where(
        AsignacionTaller.taller_id == taller_id
    ).order_by(AsignacionTaller.id.desc())
    return list(db.scalars(consulta))


def obtener_asignacion_por_incidente(db: Session, incidente_id: int) -> AsignacionTaller | None:
    consulta: Select[tuple[AsignacionTaller]] = select(AsignacionTaller).where(
        AsignacionTaller.incidente_id == incidente_id
    )
    return db.scalar(consulta)


def obtener_asignacion_por_id(db: Session, asignacion_id: int) -> AsignacionTaller | None:
    return db.get(AsignacionTaller, asignacion_id)


def crear_asignacion_taller(db: Session, incidente_id: int, payload: AsignacionTallerCrear) -> AsignacionTaller:
    asignacion = AsignacionTaller(
        incidente_id=incidente_id,
        taller_id=payload.taller_id,
        tecnico_id=payload.tecnico_id,
        tiempo_estimado_llegada_minutos=payload.tiempo_estimado_llegada_minutos,
        distancia_km=payload.distancia_km,
    )
    db.add(asignacion)
    db.commit()
    db.refresh(asignacion)
    return asignacion


def actualizar_asignacion_taller(db: Session, asignacion: AsignacionTaller, payload: AsignacionTallerActualizar) -> AsignacionTaller:
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(asignacion, campo, valor)

    db.add(asignacion)
    db.commit()
    db.refresh(asignacion)
    return asignacion


def aceptar_o_rechazar_asignacion(
    db: Session,
    asignacion: AsignacionTaller,
    es_aceptado: bool,
    motivo_rechazo: str | None = None
) -> AsignacionTaller:
    asignacion.es_aceptado = es_aceptado
    if not es_aceptado:
        asignacion.motivo_rechazo = motivo_rechazo

    db.add(asignacion)
    db.commit()
    db.refresh(asignacion)
    return asignacion


def eliminar_asignacion_taller(db: Session, asignacion: AsignacionTaller) -> None:
    db.delete(asignacion)
    db.commit()
