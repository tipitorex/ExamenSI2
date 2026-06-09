from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload, selectinload
from math import radians, cos, sin, asin, sqrt
import math
import json
from typing import Optional
from datetime import datetime, timezone

from app.models.taller import Taller
from app.models.asignacion_taller import AsignacionTaller
from app.models.incidente import Incidente
from app.models.vehiculo import Vehiculo
from app.models.cliente import Cliente
from app.models.tecnico import Tecnico
from app.models.historial_estado_incidente import HistorialEstadoIncidente
from app.schemas.asignacion_taller import AsignacionTallerActualizar, AsignacionTallerCrear
from app.services.notificacion_servicio import crear_notificacion, enviar_push_a_tecnico
from app.schemas.notificacion import NotificacionCrear, TipoNotificacionEnum
from app.core.firebase import enviar_push_notificacion
from app.models.dispositivo import Dispositivo
from app.services.suscripcion_service import verificar_limite_incidentes_mensual, incrementar_contador_incidentes


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def notificar_talleres_en_radio(
    db: Session,
    incidente,
    radio_km: float = 10.0,
) -> list[int]:
    """
    Envía push + notificación in-app a TODOS los talleres activos dentro del radio.
    NO crea AsignacionTaller. Devuelve la lista de taller_ids notificados.
    Si ninguno está en rango, notifica al más cercano como fallback.
    """
    from app.core.firebase import enviar_push_notificacion
    from app.models.dispositivo import Dispositivo

    talleres = db.execute(
        select(Taller).where(
            Taller.activo == True,
            Taller.latitud.isnot(None),
            Taller.longitud.isnot(None),
        )
    ).scalars().all()

    if not talleres:
        return []

    lat0, lon0 = incidente.latitud, incidente.longitud
    talleres_en_rango: list[tuple[Taller, float]] = []

    for taller in talleres:
        dist = _haversine(lat0, lon0, taller.latitud, taller.longitud)
        if dist <= radio_km:
            talleres_en_rango.append((taller, dist))

    # Fallback: si ninguno está en el radio, usar el más cercano
    if not talleres_en_rango:
        taller_fallback = min(talleres, key=lambda t: _haversine(lat0, lon0, t.latitud, t.longitud))
        dist_fallback = _haversine(lat0, lon0, taller_fallback.latitud, taller_fallback.longitud)
        talleres_en_rango = [(taller_fallback, dist_fallback)]

    talleres_en_rango.sort(key=lambda x: x[1])
    ids_notificados = []

    for taller, dist in talleres_en_rango:
        ids_notificados.append(taller.id)

        # Notificación in-app
        notificacion_data = NotificacionCrear(
            taller_id=taller.id,
            incidente_id=incidente.id,
            tipo=TipoNotificacionEnum.NUEVA_SOLICITUD,
            titulo="🚨 Nueva emergencia cercana",
            mensaje=f"Incidente a {dist:.1f} km. Puedes enviar tu cotización.",
            datos_extra_json=json.dumps({
                "incidente_id": incidente.id,
                "distancia_km": round(dist, 2),
                "tipo": "nueva_emergencia",
            }),
        )
        crear_notificacion(db, notificacion_data)

        # Push FCM a dispositivos del taller
        tokens = db.query(Dispositivo.fcm_token).filter(
            Dispositivo.taller_id == taller.id,
            Dispositivo.activo == True,
        ).all()
        for (token,) in tokens:
            try:
                enviar_push_notificacion(
                    fcm_token=token,
                    titulo="🚨 NUEVA EMERGENCIA CERCANA",
                    cuerpo=f"A {dist:.1f} km – {incidente.clasificacion_ia or 'Emergencia vehicular'}. ¡Envía tu cotización!",
                    datos={
                        "tipo": "nueva_emergencia",
                        "incidente_id": str(incidente.id),
                        "clasificacion": incidente.clasificacion_ia or "incierto",
                        "prioridad": incidente.prioridad,
                    },
                )
            except Exception:
                pass

    return ids_notificados


def obtener_asignaciones_por_taller(db: Session, taller_id: int) -> list[AsignacionTaller]:
    """Obtiene todas las asignaciones del taller con datos completos del incidente, vehículo y cliente"""
    
    consulta: Select[tuple[AsignacionTaller]] = select(AsignacionTaller).where(
        AsignacionTaller.taller_id == taller_id
    ).options(
        # Cargar el incidente
        joinedload(AsignacionTaller.incidente).options(
            # Dentro del incidente, cargar el vehículo y el cliente
            selectinload(Incidente.vehiculo),
            selectinload(Incidente.cliente)
        )
    ).order_by(AsignacionTaller.id.desc())
    
    resultado = db.execute(consulta)
    asignaciones = resultado.unique().scalars().all()
    return list(asignaciones)


def obtener_asignacion_por_incidente(db: Session, incidente_id: int) -> AsignacionTaller | None:
    consulta: Select[tuple[AsignacionTaller]] = select(AsignacionTaller).where(
        AsignacionTaller.incidente_id == incidente_id
    ).options(
        joinedload(AsignacionTaller.incidente).options(
            selectinload(Incidente.vehiculo),
            selectinload(Incidente.cliente)
        )
    )
    return db.scalar(consulta)


def obtener_asignacion_por_id(db: Session, asignacion_id: int) -> AsignacionTaller | None:
    consulta: Select[tuple[AsignacionTaller]] = select(AsignacionTaller).where(
        AsignacionTaller.id == asignacion_id
    ).options(
        joinedload(AsignacionTaller.incidente).options(
            selectinload(Incidente.vehiculo),
            selectinload(Incidente.cliente)
        )
    )
    return db.scalar(consulta)


def crear_asignacion_taller(db: Session, incidente_id: int, payload: AsignacionTallerCrear) -> AsignacionTaller:
    # ✅ Verificar límite mensual de incidentes del taller
    if not verificar_limite_incidentes_mensual(db, payload.taller_id):
        raise ValueError("Límite mensual de incidentes alcanzado. Actualiza tu plan para continuar.")
    
    # 1. Crear la asignación
    asignacion = AsignacionTaller(
        incidente_id=incidente_id,
        taller_id=payload.taller_id,
        tecnico_id=payload.tecnico_id,
        tiempo_estimado_llegada_minutos=payload.tiempo_estimado_llegada_minutos,
        distancia_km=payload.distancia_km,
    )
    db.add(asignacion)
    db.flush()  # Para obtener el ID de la asignación sin hacer commit aún
    
    # ✅ Incrementar contador de incidentes del taller
    incrementar_contador_incidentes(db, payload.taller_id)
    
    # 2. Crear la notificación para el taller
    titulo = "Nueva solicitud de emergencia"
    
    # Construir mensaje con información disponible
    mensaje = "Se ha asignado una nueva emergencia a tu taller."
    if payload.distancia_km:
        mensaje += f" Distancia: {payload.distancia_km:.1f} km."
    if payload.tiempo_estimado_llegada_minutos:
        mensaje += f" Tiempo estimado: {payload.tiempo_estimado_llegada_minutos} min."
    
    # Datos extra en JSON para referencia
    datos_extra = {
        "asignacion_id": asignacion.id,
        "incidente_id": incidente_id,
        "distancia_km": payload.distancia_km,
        "tiempo_estimado": payload.tiempo_estimado_llegada_minutos
    }
    
    notificacion_data = NotificacionCrear(
        taller_id=payload.taller_id,
        incidente_id=incidente_id,
        tipo=TipoNotificacionEnum.NUEVA_SOLICITUD,
        titulo=titulo,
        mensaje=mensaje,
        datos_extra_json=json.dumps(datos_extra)
    )
    
    crear_notificacion(db, notificacion_data)
    
    # 3. Finalmente hacer commit de todo
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
    db.flush()  # flush para obtener datos actualizados
    
    # Enviar notificación push al cliente
    if asignacion.incidente and asignacion.incidente.cliente_id:
        cliente_id = asignacion.incidente.cliente_id
        
        # Obtener tokens FCM del cliente
        tokens = db.query(Dispositivo.fcm_token).filter(
            Dispositivo.cliente_id == cliente_id,
            Dispositivo.activo == True
        ).all()
        
        tokens_lista = [t[0] for t in tokens]
        
        if es_aceptado:
            titulo = "✅ Emergencia aceptada"
            cuerpo = f"Tu emergencia ha sido aceptada por {asignacion.taller.nombre}. Un técnico está en camino."
            tipo_push = "taller_acepto"
        else:
            titulo = "❌ Solicitud rechazada"
            cuerpo = f"Tu emergencia fue rechazada. Motivo: {motivo_rechazo or 'No especificado'}. El sistema buscará otro taller."
            tipo_push = "taller_rechazo"
        
        # Enviar push a cada dispositivo del cliente
        for token in tokens_lista:
            enviar_push_notificacion(
                fcm_token=token,
                titulo=titulo,
                cuerpo=cuerpo,
                datos={
                    "incidente_id": str(asignacion.incidente_id),
                    "asignacion_id": str(asignacion.id),
                    "tipo": tipo_push
                }
            )
        
        # También crear notificación en BD para el historial
        notificacion_data = NotificacionCrear(
            cliente_id=cliente_id,
            incidente_id=asignacion.incidente_id,
            tipo=TipoNotificacionEnum.TALLER_ACEPTO if es_aceptado else TipoNotificacionEnum.TALLER_RECHAZO,
            titulo=titulo,
            mensaje=cuerpo,
            datos_extra_json=json.dumps({
                "asignacion_id": asignacion.id,
                "taller_nombre": asignacion.taller.nombre if asignacion.taller else None
            })
        )
        crear_notificacion(db, notificacion_data)
    
    db.commit()
    db.refresh(asignacion)
    return asignacion


def eliminar_asignacion_taller(db: Session, asignacion: AsignacionTaller) -> None:
    db.delete(asignacion)
    db.commit()


# ============================================================
# FUNCIÓN ACTUALIZADA - Aceptar asignación con técnico específico + WebSocket (ASYNC)
# ============================================================

async def aceptar_asignacion_con_tecnico(
    db: Session,
    asignacion_id: int,
    tecnico_id: int,
    taller_id: int,
    tiempo_estimado_minutos: int | None = None
) -> dict:
    """
    Acepta una asignación y asigna un técnico específico.
    Envía actualizaciones en tiempo real vía WebSocket.
    """
    # Obtener asignación
    asignacion = db.get(AsignacionTaller, asignacion_id)
    if asignacion is None:
        raise ValueError("Asignación no encontrada")
    
    if asignacion.taller_id != taller_id:
        raise ValueError("La asignación no pertenece a este taller")
    
    if asignacion.tecnico_id is not None:
        raise ValueError("Esta asignación ya tiene un técnico asignado")

    # Obtener técnico
    tecnico = db.query(Tecnico).filter(
        Tecnico.id == tecnico_id,
        Tecnico.taller_id == taller_id
    ).first()
    
    if tecnico is None:
        raise ValueError("Técnico no encontrado")
    
    if not tecnico.disponible:
        raise ValueError(f"El técnico {tecnico.nombre_completo} no está disponible")
    
    # Actualizar asignación
    asignacion.es_aceptado = True
    asignacion.tecnico_id = tecnico_id
    if tiempo_estimado_minutos:
        asignacion.tiempo_estimado_llegada_minutos = tiempo_estimado_minutos
    
    # Marcar técnico como no disponible
    tecnico.disponible = False
    
    # Actualizar estado del incidente
    incidente = asignacion.incidente
    estado_anterior = incidente.estado
    incidente.estado = "taller_asignado"
    incidente.fecha_asignacion = datetime.now(timezone.utc)
    incidente.actualizado_en = datetime.now(timezone.utc)

    # Registrar en historial
    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_anterior,
        estado_nuevo="taller_asignado",
        observacion=f"Técnico {tecnico.nombre_completo} asignado por taller",
        usuario_que_cambio=f"taller_{taller_id}",
    )
    db.add(historial)
    
    # Crear notificación para el cliente
    if incidente.cliente_id:
        notificacion_data = NotificacionCrear(
            cliente_id=incidente.cliente_id,
            incidente_id=incidente.id,
            tipo=TipoNotificacionEnum.TALLER_ACEPTO,
            titulo="✅ Emergencia aceptada",
            mensaje=f"Tu emergencia ha sido aceptada por {asignacion.taller.nombre}. Técnico: {tecnico.nombre_completo} en camino.",
            datos_extra_json=json.dumps({
                "asignacion_id": asignacion.id,
                "tecnico_nombre": tecnico.nombre_completo,
                "tiempo_estimado": asignacion.tiempo_estimado_llegada_minutos
            })
        )
        crear_notificacion(db, notificacion_data)
        
        # Enviar push notification
        tokens = db.query(Dispositivo.fcm_token).filter(
            Dispositivo.cliente_id == incidente.cliente_id,
            Dispositivo.activo == True
        ).all()
        
        for token in tokens:
            enviar_push_notificacion(
                fcm_token=token[0],
                titulo="✅ Emergencia aceptada",
                cuerpo=f"Técnico {tecnico.nombre_completo} asignado. Tiempo estimado: {asignacion.tiempo_estimado_llegada_minutos} min",
                datos={
                    "incidente_id": str(incidente.id),
                    "tipo": "taller_acepto"
                }
            )
    
    db.commit()
    db.refresh(asignacion)

    # ============================================================
    # PUSH + NOTIFICACIÓN IN-APP AL TÉCNICO
    # ============================================================
    enviar_push_a_tecnico(
        db=db,
        tecnico_id=tecnico_id,
        titulo="🔧 Nueva asignación",
        cuerpo=f"Se te asignó una emergencia. Incidente #{incidente.id} – {incidente.clasificacion_ia or 'General'}",
        datos={
            "tipo": "tecnico_asignado",
            "incidente_id": str(incidente.id),
            "asignacion_id": str(asignacion.id),
        },
    )

    notif_tecnico = NotificacionCrear(
        tecnico_id=tecnico_id,
        incidente_id=incidente.id,
        tipo=TipoNotificacionEnum.TECNICO_ASIGNADO,
        titulo="🔧 Nueva asignación",
        mensaje=f"Se te asignó el incidente #{incidente.id}. Dirígete a la ubicación indicada.",
        datos_extra_json=json.dumps({
            "asignacion_id": asignacion.id,
            "clasificacion": incidente.clasificacion_ia,
        }),
    )
    crear_notificacion(db, notif_tecnico)

    # ============================================================
    # BROADCAST VÍA WEBSOCKET - NOTIFICAR CAMBIO DE ESTADO
    # ============================================================
    from app.services.websocket_manager import manager
    
    # Broadcast del nuevo estado en tiempo real
    await manager.broadcast_estado_incidente(
        incidente_id=incidente.id,
        estado="taller_asignado",
        taller_id=taller_id,
        cliente_id=incidente.cliente_id,
        data_extra={
            "tecnico_nombre": tecnico.nombre_completo,
            "tecnico_telefono": tecnico.telefono,
            "tecnico_especialidad": tecnico.especialidad,
            "tiempo_estimado": asignacion.tiempo_estimado_llegada_minutos,
            "taller_nombre": asignacion.taller.nombre,
        }
    )
    
    return {
        "success": True,
        "asignacion_id": asignacion.id,
        "tecnico": {
            "id": tecnico.id,
            "nombre": tecnico.nombre_completo,
            "telefono": tecnico.telefono,
            "especialidad": tecnico.especialidad,
        },
        "tiempo_estimado_llegada_minutos": asignacion.tiempo_estimado_llegada_minutos,
        "incidente_estado": incidente.estado
    }