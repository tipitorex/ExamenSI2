from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual, obtener_taller_actual
from app.models.cliente import Cliente
from app.models.taller import Taller
from app.schemas.notificacion import NotificacionCrear, NotificacionMarcarLeida, NotificacionRespuesta
from app.services.notificacion_servicio import (
    crear_notificacion,
    eliminar_notificacion,
    marcar_notificacion_leida,
    obtener_notificacion_por_id,
    obtener_notificaciones_por_cliente,
    obtener_notificaciones_por_taller,
)

router = APIRouter()


@router.get("/cliente")
def listar_notificaciones_cliente(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[NotificacionRespuesta]:
    """Obtener todas las notificaciones del cliente actual"""
    notificaciones = obtener_notificaciones_por_cliente(db, cliente_actual.id)
    return [NotificacionRespuesta.model_validate(n) for n in notificaciones]


@router.get("/taller")
def listar_notificaciones_taller(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> list[NotificacionRespuesta]:
    """Obtener todas las notificaciones del taller actual"""
    notificaciones = obtener_notificaciones_por_taller(db, taller_actual.id)
    return [NotificacionRespuesta.model_validate(n) for n in notificaciones]


@router.get("/{notificacion_id}")
def obtener_notificacion(
    notificacion_id: int,
    db: Session = Depends(get_db),
) -> NotificacionRespuesta:
    """Obtener una notificación específica"""
    notificacion = obtener_notificacion_por_id(db, notificacion_id)
    if notificacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada",
        )

    return NotificacionRespuesta.model_validate(notificacion)


@router.put("/{notificacion_id}/marcar-leida")
def marcar_leida(
    notificacion_id: int,
    payload: NotificacionMarcarLeida,
    db: Session = Depends(get_db),
) -> NotificacionRespuesta:
    """Marcar una notificación como leída o no leída"""
    notificacion = obtener_notificacion_por_id(db, notificacion_id)
    if notificacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada",
        )

    notificacion_actualizada = marcar_notificacion_leida(db, notificacion, payload)
    return NotificacionRespuesta.model_validate(notificacion_actualizada)


@router.delete("/{notificacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_notificacion_handler(
    notificacion_id: int,
    db: Session = Depends(get_db),
) -> Response:
    """Eliminar una notificación"""
    notificacion = obtener_notificacion_por_id(db, notificacion_id)
    if notificacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada",
        )

    eliminar_notificacion(db, notificacion)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
