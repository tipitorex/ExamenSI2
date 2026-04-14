from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_taller_actual
from app.models.asignacion_taller import AsignacionTaller
from app.models.taller import Taller
from app.schemas.asignacion_taller import (
    AsignacionTallerAceptarRechazar,
    AsignacionTallerActualizar,
    AsignacionTallerCrear,
    AsignacionTallerRespuesta,
)
from app.services.asignacion_taller_servicio import (
    aceptar_o_rechazar_asignacion,
    actualizar_asignacion_taller,
    crear_asignacion_taller,
    eliminar_asignacion_taller,
    obtener_asignacion_por_id,
    obtener_asignaciones_por_taller,
)

router = APIRouter()


@router.post("")
def crear_asignacion(
    payload: AsignacionTallerCrear,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> AsignacionTallerRespuesta:
    """Crear una nueva asignación de incidente a taller (solo admin/sistema)"""
    asignacion = crear_asignacion_taller(db, payload.incidente_id if hasattr(payload, 'incidente_id') else None, payload)
    return AsignacionTallerRespuesta.model_validate(asignacion)


@router.get("")
def listar_asignaciones(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> list[AsignacionTallerRespuesta]:
    """Obtener todas las asignaciones del taller actual"""
    asignaciones = obtener_asignaciones_por_taller(db, taller_actual.id)
    return [AsignacionTallerRespuesta.model_validate(a) for a in asignaciones]

def crear_asignacion(
    incidente_id: int,
    payload: AsignacionTallerCrear,
    db: Session = Depends(get_db),
) -> AsignacionTallerRespuesta:
    """Crear una nueva asignación de incidente a taller"""
    from app.models.incidente import Incidente
    incidente = db.get(Incidente, incidente_id)
    if incidente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )
    asignacion = crear_asignacion_taller(db, incidente_id, payload)
    return AsignacionTallerRespuesta.model_validate(asignacion)

@router.get("/{asignacion_id}")
def obtener_asignacion(
    asignacion_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> AsignacionTallerRespuesta:
    """Obtener los detalles de una asignación específica"""
    asignacion = obtener_asignacion_por_id(db, asignacion_id)
    if asignacion is None or asignacion.taller_id != taller_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada",
        )

    return AsignacionTallerRespuesta.model_validate(asignacion)


@router.put("/{asignacion_id}")
def actualizar_asignacion(
    asignacion_id: int,
    payload: AsignacionTallerActualizar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> AsignacionTallerRespuesta:
    """Actualizar detalles de una asignación"""
    asignacion = obtener_asignacion_por_id(db, asignacion_id)
    if asignacion is None or asignacion.taller_id != taller_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada",
        )

    asignacion_actualizada = actualizar_asignacion_taller(db, asignacion, payload)
    return AsignacionTallerRespuesta.model_validate(asignacion_actualizada)


@router.post("/{asignacion_id}/aceptar-rechazar")
def aceptar_rechazar_asignacion(
    asignacion_id: int,
    payload: AsignacionTallerAceptarRechazar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> AsignacionTallerRespuesta:
    """Aceptar o rechazar una asignación"""
    asignacion = obtener_asignacion_por_id(db, asignacion_id)
    if asignacion is None or asignacion.taller_id != taller_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada",
        )

    asignacion_actualizada = aceptar_o_rechazar_asignacion(
        db,
        asignacion,
        payload.es_aceptado,
        payload.motivo_rechazo,
    )
    return AsignacionTallerRespuesta.model_validate(asignacion_actualizada)


@router.delete("/{asignacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_asignacion(
    asignacion_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Response:
    """Eliminar una asignación"""
    asignacion = obtener_asignacion_por_id(db, asignacion_id)
    if asignacion is None or asignacion.taller_id != taller_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada",
        )

    eliminar_asignacion_taller(db, asignacion)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
