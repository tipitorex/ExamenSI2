from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.notificacion import Notificacion
from app.schemas.notificacion import NotificacionCrear, NotificacionMarcarLeida


def obtener_notificaciones_por_cliente(db: Session, cliente_id: int) -> list[Notificacion]:
    consulta: Select[tuple[Notificacion]] = select(Notificacion).where(
        Notificacion.cliente_id == cliente_id
    ).order_by(Notificacion.fecha_envio.desc())
    return list(db.scalars(consulta))


def obtener_notificaciones_por_taller(db: Session, taller_id: int) -> list[Notificacion]:
    consulta: Select[tuple[Notificacion]] = select(Notificacion).where(
        Notificacion.taller_id == taller_id
    ).order_by(Notificacion.fecha_envio.desc())
    return list(db.scalars(consulta))


def obtener_notificacion_por_id(db: Session, notificacion_id: int) -> Notificacion | None:
    return db.get(Notificacion, notificacion_id)


def crear_notificacion(db: Session, payload: NotificacionCrear) -> Notificacion:
    notificacion = Notificacion(
        cliente_id=payload.cliente_id,
        taller_id=payload.taller_id,
        incidente_id=payload.incidente_id,
        tipo=payload.tipo,
        titulo=payload.titulo,
        mensaje=payload.mensaje,
        datos_extra_json=payload.datos_extra_json,
    )
    db.add(notificacion)
    db.commit()
    db.refresh(notificacion)
    return notificacion


def marcar_notificacion_leida(db: Session, notificacion: Notificacion, payload: NotificacionMarcarLeida) -> Notificacion:
    notificacion.leido = payload.leido
    db.add(notificacion)
    db.commit()
    db.refresh(notificacion)
    return notificacion


def eliminar_notificacion(db: Session, notificacion: Notificacion) -> None:
    db.delete(notificacion)
    db.commit()
