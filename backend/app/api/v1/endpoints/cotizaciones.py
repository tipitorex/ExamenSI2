import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, obtener_cliente_actual, obtener_taller_actual
from app.models.asignacion_taller import AsignacionTaller
from app.models.cliente import Cliente
from app.models.cotizacion import Cotizacion
from app.models.historial_estado_incidente import HistorialEstadoIncidente
from app.models.incidente import Incidente
from app.models.taller import Taller
from app.schemas.cotizacion import CotizacionCrear, CotizacionRespuesta
from app.schemas.notificacion import NotificacionCrear, TipoNotificacionEnum
from app.services.notificacion_servicio import crear_notificacion, enviar_notificacion_push_a_taller, enviar_push_a_cliente
from app.services.suscripcion_service import verificar_limite_incidentes_mensual, incrementar_contador_incidentes

router = APIRouter()


# ============================================================
# TALLER: Enviar cotización para un incidente
# ============================================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def crear_cotizacion(
    payload: CotizacionCrear,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> CotizacionRespuesta:
    """Taller envía una cotización de reparación para un incidente activo."""
    incidente = db.get(Incidente, payload.incidente_id)
    if incidente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    if incidente.estado in ("atendido", "cancelado", "finalizado"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede cotizar un incidente ya finalizado",
        )

    existente = db.scalar(
        select(Cotizacion).where(
            Cotizacion.incidente_id == payload.incidente_id,
            Cotizacion.taller_id == taller_actual.id,
            Cotizacion.estado == "pendiente",
        )
    )
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya tienes una cotización pendiente para este incidente",
        )

    cotizacion = Cotizacion(
        incidente_id=payload.incidente_id,
        taller_id=taller_actual.id,
        monto_total=payload.monto_total,
        tiempo_estimado_reparacion_minutos=payload.tiempo_en_minutos,
        detalles_servicio=payload.detalles_json,
        notas=payload.notas,
        estado="pendiente",
    )
    db.add(cotizacion)
    db.commit()
    db.refresh(cotizacion)

    # Notificar al cliente vía WebSocket
    from app.services.websocket_manager import manager
    await manager.send_to_cliente(
        incidente.cliente_id,
        {
            "tipo": "nueva_cotizacion",
            "data": {
                "cotizacion_id": cotizacion.id,
                "incidente_id": incidente.id,
                "taller_nombre": taller_actual.nombre,
                "monto_total": cotizacion.monto_total,
                "tiempo_estimado_reparacion_horas": round(cotizacion.tiempo_estimado_reparacion_minutos / 60, 2),
            },
        },
    )

    return CotizacionRespuesta.model_validate(cotizacion)


# ============================================================
# TALLER: Listar cotizaciones enviadas por el taller actual
# ============================================================

@router.get("/mis-cotizaciones")
def listar_mis_cotizaciones(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> list[CotizacionRespuesta]:
    """Devuelve todas las cotizaciones enviadas por el taller."""
    cotizaciones = db.scalars(
        select(Cotizacion)
        .where(Cotizacion.taller_id == taller_actual.id)
        .order_by(Cotizacion.creado_en.desc())
    ).all()
    return [CotizacionRespuesta.model_validate(c) for c in cotizaciones]


# ============================================================
# CLIENTE: Ver cotizaciones de su incidente
# ============================================================

@router.get("/incidente/{incidente_id}")
def listar_cotizaciones_incidente(
    incidente_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[CotizacionRespuesta]:
    """Cliente ve todas las cotizaciones recibidas para un incidente suyo."""
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    cotizaciones = db.scalars(
        select(Cotizacion)
        .options(joinedload(Cotizacion.taller))
        .where(Cotizacion.incidente_id == incidente_id)
        .order_by(Cotizacion.creado_en)
    ).all()
    return [CotizacionRespuesta.model_validate(c) for c in cotizaciones]


# ============================================================
# CLIENTE: Aceptar una cotización → crea AsignacionTaller
# ============================================================

@router.post("/{cotizacion_id}/aceptar")
async def aceptar_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> dict:
    """
    Cliente acepta una cotización.
    Rechaza automáticamente las demás y crea (o actualiza) la AsignacionTaller.
    """
    cotizacion = db.scalar(
        select(Cotizacion)
        .options(joinedload(Cotizacion.taller))
        .where(Cotizacion.id == cotizacion_id)
    )
    if cotizacion is None or cotizacion.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cotización no encontrada o ya procesada",
        )

    incidente = db.get(Incidente, cotizacion.incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    # Verificar límite del plan del taller ganador
    if not verificar_limite_incidentes_mensual(db, cotizacion.taller_id):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="El taller alcanzó su límite mensual de incidentes",
        )

    # Marcar esta cotización como aceptada
    cotizacion.estado = "aceptada"

    # Rechazar todas las demás del mismo incidente
    otras = db.scalars(
        select(Cotizacion).where(
            Cotizacion.incidente_id == cotizacion.incidente_id,
            Cotizacion.id != cotizacion_id,
            Cotizacion.estado == "pendiente",
        )
    ).all()
    for otra in otras:
        otra.estado = "rechazada"

    # Crear o actualizar AsignacionTaller
    asignacion = db.scalar(
        select(AsignacionTaller).where(
            AsignacionTaller.incidente_id == cotizacion.incidente_id
        )
    )
    if asignacion is None:
        asignacion = AsignacionTaller(
            incidente_id=cotizacion.incidente_id,
            taller_id=cotizacion.taller_id,
            es_aceptado=True,
        )
        db.add(asignacion)
    else:
        asignacion.taller_id = cotizacion.taller_id
        asignacion.es_aceptado = True

    # Actualizar estado del incidente a taller_asignado
    incidente.estado = "taller_asignado"
    incidente.actualizado_en = datetime.now(timezone.utc)
    db.add(HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior="pendiente",
        estado_nuevo="taller_asignado",
        observacion=f"Cliente aceptó cotización del taller {cotizacion.taller.nombre if cotizacion.taller else cotizacion.taller_id}",
    ))

    # Incrementar contador de incidentes del taller
    incrementar_contador_incidentes(db, cotizacion.taller_id)

    db.commit()
    db.refresh(cotizacion)

    taller_nombre = cotizacion.taller.nombre if cotizacion.taller else f"Taller #{cotizacion.taller_id}"

    # Notificación in-app al taller
    crear_notificacion(db, NotificacionCrear(
        taller_id=cotizacion.taller_id,
        incidente_id=incidente.id,
        tipo=TipoNotificacionEnum.NUEVA_SOLICITUD,
        titulo="✅ Cotización aceptada",
        mensaje=f"El cliente aceptó tu cotización. Monto: Bs. {cotizacion.monto_total:.2f}. Asigna un técnico.",
        datos_extra_json=json.dumps({"cotizacion_id": cotizacion.id, "incidente_id": incidente.id}),
    ))

    # Push FCM al taller ganador
    try:
        enviar_notificacion_push_a_taller(
            taller_id=cotizacion.taller_id,
            titulo="✅ ¡Cotización aceptada!",
            cuerpo=f"El cliente aceptó tu oferta de Bs. {cotizacion.monto_total:.2f}. ¡Asigna un técnico ahora!",
            datos={
                "tipo": "cotizacion_aceptada",
                "incidente_id": str(incidente.id),
                "cotizacion_id": str(cotizacion.id),
            },
        )
    except Exception:
        pass

    # Push FCM al cliente confirmando
    try:
        enviar_push_a_cliente(
            db=db,
            cliente_id=incidente.cliente_id,
            titulo="🔧 Taller confirmado",
            cuerpo=f"{taller_nombre} atenderá tu emergencia. Pronto asignarán un técnico.",
            datos={"tipo": "taller_asignado", "incidente_id": str(incidente.id)},
        )
    except Exception:
        pass

    # WebSocket al taller ganador
    from app.services.websocket_manager import manager
    await manager.send_to_taller(
        cotizacion.taller_id,
        {
            "tipo": "cotizacion_aceptada",
            "data": {
                "cotizacion_id": cotizacion.id,
                "incidente_id": cotizacion.incidente_id,
                "monto_total": cotizacion.monto_total,
                "tiempo_reparacion_minutos": cotizacion.tiempo_estimado_reparacion_minutos,
                "mensaje": "El cliente aceptó tu cotización. Prepara el servicio.",
            },
        },
    )

    # WebSocket al cliente
    await manager.broadcast_estado_incidente(
        incidente_id=incidente.id,
        estado="taller_asignado",
        taller_id=cotizacion.taller_id,
        cliente_id=incidente.cliente_id,
        data_extra={"taller_nombre": taller_nombre, "monto_aceptado": cotizacion.monto_total},
    )

    return {
        "success": True,
        "cotizacion_id": cotizacion.id,
        "taller_id": cotizacion.taller_id,
        "taller_nombre": taller_nombre,
        "incidente_id": cotizacion.incidente_id,
        "monto_total": cotizacion.monto_total,
        "tiempo_reparacion_minutos": cotizacion.tiempo_estimado_reparacion_minutos,
    }
