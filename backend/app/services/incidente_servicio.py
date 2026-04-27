import logging
from datetime import datetime
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.models.historial_estado_incidente import HistorialEstadoIncidente
from app.models.incidente import Incidente
from app.models.vehiculo import Vehiculo
from app.schemas.incidente import IncidenteActualizarEstado, IncidenteCrear
from app.services.ia_servicio import clasificar_incidente_por_texto, generar_resumen_ia, mejorar_descripcion_con_ia

logger = logging.getLogger(__name__)

TRANSICIONES_ESTADO_VALIDAS: dict[str, set[str]] = {
    "pendiente": {"en_proceso", "cancelado"},
    "en_proceso": {"atendido", "cancelado"},
    "atendido": {"cerrado"},
    "cerrado": set(),
    "cancelado": set(),
}


def obtener_vehiculo_de_cliente(db: Session, vehiculo_id: int, cliente_id: int) -> Vehiculo | None:
    consulta: Select[tuple[Vehiculo]] = select(Vehiculo).where(
        Vehiculo.id == vehiculo_id,
        Vehiculo.cliente_id == cliente_id,
    )
    return db.scalar(consulta)


def crear_incidente_con_ia(
    db: Session, 
    cliente_id: int, 
    payload: IncidenteCrear,
    transcripcion_audio: str | None = None,
) -> tuple[Incidente, dict]:
    """
    Crea un incidente aplicando clasificación por IA.
    Si se proporciona transcripción de audio, la usa para mejorar la clasificación.
    """
    # 1. Mejorar descripción si hay transcripción
    descripcion_final = payload.descripcion
    if transcripcion_audio:
        descripcion_final = mejorar_descripcion_con_ia(payload.descripcion, transcripcion_audio)
        logger.info(f"🎤 Usando transcripción de audio para mejorar descripción")
    
    # 2. Clasificar con IA usando descripción y transcripción
    analisis = clasificar_incidente_por_texto(
        payload.descripcion, 
        transcripcion_audio
    )
    
    logger.info(f"🔍 Clasificación IA: {analisis['clasificacion']} (confianza: {analisis['confianza']})")
    if analisis.get('uso_transcripcion'):
        logger.info(f"🎤 Se usó transcripción de audio en la clasificación")
    
    # 3. Determinar prioridad final
    prioridad_final = analisis["prioridad"]
    if payload.prioridad == "alta" and analisis["prioridad"] != "alta":
        prioridad_final = "alta"
    
    # 4. Generar resumen
    resumen = generar_resumen_ia(
        descripcion=payload.descripcion,
        clasificacion=analisis["clasificacion"],
        confianza=analisis["confianza"],
        transcripcion=transcripcion_audio
    )
    
    # 5. Crear incidente con datos de IA
    incidente = Incidente(
        cliente_id=cliente_id,
        vehiculo_id=payload.vehiculo_id,
        latitud=payload.latitud,
        longitud=payload.longitud,
        descripcion=descripcion_final,
        prioridad=prioridad_final,
        clasificacion_ia=analisis["clasificacion"],
        resumen_ia=resumen,
        estado="pendiente",
    )
    db.add(incidente)
    db.flush()
    
    # 6. Registrar historial
    observacion = f"Incidente creado. IA clasifica como: {analisis['clasificacion']} (confianza: {analisis['confianza']:.2f})"
    if transcripcion_audio:
        observacion += f" | Audio transcrito: {transcripcion_audio[:100]}..."
    
    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=None,
        estado_nuevo="pendiente",
        observacion=observacion,
    )
    db.add(historial)
    db.commit()
    db.refresh(incidente)
    
    return incidente, analisis


def crear_incidente_legacy(db: Session, cliente_id: int, payload: IncidenteCrear) -> Incidente:
    """Versión legacy sin IA (para compatibilidad)."""
    incidente = Incidente(
        cliente_id=cliente_id,
        vehiculo_id=payload.vehiculo_id,
        latitud=payload.latitud,
        longitud=payload.longitud,
        descripcion=payload.descripcion,
        prioridad=payload.prioridad,
        estado="pendiente",
    )
    db.add(incidente)
    db.flush()

    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=None,
        estado_nuevo="pendiente",
        observacion="Incidente creado",
    )
    db.add(historial)
    db.commit()
    db.refresh(incidente)
    return incidente


def obtener_incidentes_por_cliente(db: Session, cliente_id: int) -> list[Incidente]:
    consulta: Select[tuple[Incidente]] = (
        select(Incidente)
        .where(Incidente.cliente_id == cliente_id)
        .options(selectinload(Incidente.historial_estados))
        .order_by(Incidente.id.desc())
    )
    return list(db.scalars(consulta))


def obtener_incidente_por_id(db: Session, incidente_id: int) -> Incidente | None:
    consulta: Select[tuple[Incidente]] = (
        select(Incidente)
        .where(Incidente.id == incidente_id)
        .options(selectinload(Incidente.historial_estados))
    )
    return db.scalar(consulta)


def actualizar_estado_incidente(
    db: Session,
    incidente: Incidente,
    payload: IncidenteActualizarEstado,
) -> Incidente:
    estado_actual = incidente.estado
    estado_nuevo = payload.estado_nuevo

    if estado_actual == estado_nuevo:
        return incidente

    estados_validos = TRANSICIONES_ESTADO_VALIDAS.get(estado_actual, set())
    if estado_nuevo not in estados_validos:
        raise ValueError(f"No se permite transicion de '{estado_actual}' a '{estado_nuevo}'")

    incidente.estado = estado_nuevo
    
    # ✅ ACTUALIZAR FECHAS SEGÚN EL ESTADO
    if estado_nuevo == "en_proceso" and not incidente.fecha_atencion:
        incidente.fecha_atencion = datetime.now()
        logger.info(f"📅 Incidente {incidente.id} - Fecha de atención registrada: {incidente.fecha_atencion}")
    
    if estado_nuevo == "atendido" and not incidente.fecha_finalizacion:
        incidente.fecha_finalizacion = datetime.now()
        logger.info(f"📅 Incidente {incidente.id} - Fecha de finalización registrada: {incidente.fecha_finalizacion}")
    
    # Registrar historial
    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_actual,
        estado_nuevo=estado_nuevo,
        observacion=payload.observacion,
    )
    db.add(incidente)
    db.add(historial)
    db.commit()
    db.refresh(incidente)
    
    return incidente