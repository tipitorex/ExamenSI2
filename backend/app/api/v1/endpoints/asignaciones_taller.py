from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.api.deps import get_db, obtener_taller_actual
from app.models.asignacion_taller import AsignacionTaller
from app.models.taller import Taller
from app.schemas.asignacion_taller import (
    AsignacionTallerAceptarRechazar,
    AsignacionTallerActualizar,
    AsignacionTallerCrear,
    AsignacionTallerRespuesta,
)
from app.schemas.incidente import IncidenteActualizarEstado
from app.services.asignacion_taller_servicio import (
    aceptar_o_rechazar_asignacion,
    actualizar_asignacion_taller,
    crear_asignacion_taller,
    eliminar_asignacion_taller,
    obtener_asignacion_por_id,
    obtener_asignaciones_por_taller,
    aceptar_asignacion_con_tecnico,
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


@router.patch("/{asignacion_id}/estado-incidente")
def actualizar_estado_incidente_por_taller(
    asignacion_id: int,
    payload: IncidenteActualizarEstado,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Actualizar el estado del incidente asociado a una asignación.
    
    Estados válidos para taller:
    - pendiente → en_proceso
    - en_proceso → atendido
    
    Requisitos:
    - La asignación debe pertenecer al taller
    - La asignación debe estar aceptada (es_aceptado = True)
    """
    # 1. Verificar que la asignación existe y pertenece al taller
    asignacion = obtener_asignacion_por_id(db, asignacion_id)
    if asignacion is None or asignacion.taller_id != taller_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada"
        )
    
    # 2. Verificar que el taller aceptó la asignación
    if not asignacion.es_aceptado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede actualizar el estado de una asignación no aceptada"
        )
    
    # 3. Obtener el incidente
    incidente = asignacion.incidente
    if incidente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado"
        )
    
    # 4. Validar transiciones de estado permitidas para taller
    estado_actual = incidente.estado
    estado_nuevo = payload.estado
    
    transiciones_permitidas = {
        "pendiente": ["en_proceso"],
        "en_proceso": ["atendido"],
    }
    
    if estado_nuevo not in transiciones_permitidas.get(estado_actual, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transición no permitida: {estado_actual} → {estado_nuevo}. Transiciones permitidas: {transiciones_permitidas.get(estado_actual, [])}"
        )
    
    # 5. Actualizar fechas según el nuevo estado
    if estado_nuevo == "en_proceso" and incidente.fecha_atencion is None:
        incidente.fecha_atencion = datetime.now(timezone.utc)
    elif estado_nuevo == "atendido" and incidente.fecha_finalizacion is None:
        incidente.fecha_finalizacion = datetime.now(timezone.utc)
    
    # 6. Actualizar el estado
    incidente.estado = estado_nuevo
    incidente.actualizado_en = datetime.now(timezone.utc)
    
    # 7. Registrar en historial
    from app.models.historial_estado_incidente import HistorialEstadoIncidente
    
    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_actual,
        estado_nuevo=estado_nuevo,
        observacion=f"Actualizado por taller: {taller_actual.nombre}",
        usuario_que_cambio=f"taller_{taller_actual.id}",
    )
    db.add(historial)
    
    # 8. Commit
    db.commit()
    db.refresh(incidente)
    
    # 9. Retornar respuesta
    from app.schemas.incidente import IncidenteDetalleRespuesta
    return IncidenteDetalleRespuesta.model_validate(incidente)


# ============================================================
# NUEVO ENDPOINT - Aceptar asignación con técnico específico
# ============================================================

@router.post("/{asignacion_id}/aceptar-con-tecnico")
def aceptar_asignacion_con_tecnico_endpoint(
    asignacion_id: int,
    tecnico_id: int,
    tiempo_estimado_minutos: int | None = None,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Aceptar una asignación y asignar un técnico específico.
    
    Parámetros:
    - asignacion_id: ID de la asignación a aceptar
    - tecnico_id: ID del técnico a asignar (debe pertenecer al taller)
    - tiempo_estimado_minutos: Tiempo estimado de llegada (opcional)
    
    Requisitos:
    - La asignación debe pertenecer al taller actual
    - El técnico debe pertenecer al taller y estar disponible
    """
    try:
        resultado = aceptar_asignacion_con_tecnico(
            db=db,
            asignacion_id=asignacion_id,
            tecnico_id=tecnico_id,
            taller_id=taller_actual.id,
            tiempo_estimado_minutos=tiempo_estimado_minutos
        )
        return resultado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )