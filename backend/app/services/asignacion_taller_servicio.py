from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload, selectinload
from math import radians, cos, sin, asin, sqrt
import math
import json  # ← AGREGADO para json.dumps()
from typing import Optional

from app.models.taller import Taller
from app.models.asignacion_taller import AsignacionTaller
from app.models.incidente import Incidente
from app.models.vehiculo import Vehiculo
from app.models.cliente import Cliente
from app.schemas.asignacion_taller import AsignacionTallerActualizar, AsignacionTallerCrear
# NUEVOS IMPORTS para notificaciones
from app.services.notificacion_servicio import crear_notificacion
from app.schemas.notificacion import NotificacionCrear, TipoNotificacionEnum


def asignar_taller_mas_cercano(db: Session, incidente) -> AsignacionTaller | None:
    """
    Busca el taller activo más cercano al incidente y crea la asignación.
    """
    # Obtener talleres activos con coordenadas (usando SQLAlchemy 2.0)
    consulta = select(Taller).where(
        Taller.activo == True,
        Taller.latitud.isnot(None),
        Taller.longitud.isnot(None)
    )
    talleres = db.execute(consulta).scalars().all()
    
    if not talleres:
        return None

    def haversine(lat1, lon1, lat2, lon2):
        """Fórmula de Haversine para distancia en km"""
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return R * c

    lat0, lon0 = incidente.latitud, incidente.longitud
    taller_cercano = None
    min_dist = float('inf')
    
    for taller in talleres:
        dist = haversine(lat0, lon0, taller.latitud, taller.longitud)
        if dist < min_dist:
            min_dist = dist
            taller_cercano = taller

    if taller_cercano is None:
        return None

    # Crear asignación con tiempo estimado corregido
    # Velocidad promedio: 30 km/h en ciudad
    tiempo_calculado = (min_dist / 30) * 60  # tiempo en minutos
    tiempo_estimado = max(1, math.ceil(tiempo_calculado))  # Mínimo 1 minuto, redondeado arriba
    
    payload = AsignacionTallerCrear(
        taller_id=taller_cercano.id,
        tecnico_id=None,
        tiempo_estimado_llegada_minutos=tiempo_estimado,
        distancia_km=min_dist
    )
    return crear_asignacion_taller(db, incidente.id, payload)


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
    db.commit()
    db.refresh(asignacion)
    return asignacion


def eliminar_asignacion_taller(db: Session, asignacion: AsignacionTaller) -> None:
    db.delete(asignacion)
    db.commit()