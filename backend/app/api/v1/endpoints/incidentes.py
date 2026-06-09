import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from math import radians, cos, sin, asin, sqrt

from app.api.deps import get_db, obtener_cliente_actual, obtener_taller_actual, obtener_tecnico_actual
from app.models.cliente import Cliente
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.models.evidencia import Evidencia, TipoEvidencia
from app.schemas.incidente import (
    IncidenteActualizarEstado,
    IncidenteCrear,
    IncidenteDetalleRespuesta,
    IncidenteReporteRespuesta,
    VehiculoBasicoRespuesta,
    ClienteBasicoRespuesta,
)
from app.services.incidente_servicio import (
    actualizar_estado_incidente,
    crear_incidente_con_ia,
    obtener_incidente_por_id,
    obtener_incidentes_por_cliente,
    obtener_vehiculo_de_cliente,
)
from app.services.asignacion_taller_servicio import notificar_talleres_en_radio
from app.services.transcripcion_servicio import transcripcion_service
from app.services.vision_servicio import vision_service
from app.services.ia_servicio import generar_resumen_ia
from app.services.notificacion_servicio import enviar_notificacion_push_a_taller  # noqa: F401 (kept for other uses)

router = APIRouter()

# Configurar directorio para guardar evidencias
MEDIA_DIR = "media/evidencias"
os.makedirs(MEDIA_DIR, exist_ok=True)

# Estados que se consideran activos (no finalizados)
ESTADOS_ACTIVOS = ["pendiente", "taller_asignado", "en_camino", "en_proceso", "atencion"]


def guardar_evidencia_db(db: Session, incidente_id: int, file: UploadFile, tipo: TipoEvidencia, transcripcion: str = None) -> str | None:
    if not file or not file.filename:
        return None
    
    import uuid
    extension = os.path.splitext(file.filename)[1]
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    ruta_completa = os.path.join(MEDIA_DIR, nombre_archivo)
    
    try:
        contenido = file.file.read()
        with open(ruta_completa, "wb") as f:
            f.write(contenido)
        file.file.seek(0)
    except Exception as e:
        print(f"Error guardando archivo: {e}")
        return None
    
    evidencia = Evidencia(
        incidente_id=incidente_id,
        tipo=tipo,
        url_archivo=ruta_completa,
        transcripcion_texto=transcripcion,
    )
    db.add(evidencia)
    db.commit()
    
    return ruta_completa


def calcular_distancia_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula distancia en km usando fórmula de Haversine"""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c


@router.post("", response_model=IncidenteReporteRespuesta)
async def reportar_incidente(
    vehiculo_id: int = Form(...),
    latitud: float = Form(...),
    longitud: float = Form(...),
    descripcion: Optional[str] = Form(None),
    prioridad: str = Form("media"),
    client_request_id: Optional[str] = Form(None),
    imagen_frontal: UploadFile = File(None),
    imagenes_adicionales: List[UploadFile] = File([]),
    audio: UploadFile = File(None),
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    from app.models.incidente import Incidente as IncidenteModel

    # Idempotencia: si el cliente ya envió este request_id, devolver el incidente existente
    if client_request_id:
        existente = db.query(IncidenteModel).filter(
            IncidenteModel.client_request_id == client_request_id,
            IncidenteModel.cliente_id == cliente_actual.id,
        ).first()
        if existente:
            return IncidenteReporteRespuesta(
                id=existente.id,
                clasificacion_ia=existente.clasificacion_ia or "incierto",
                prioridad=existente.prioridad,
                resumen_ia=existente.resumen_ia or "Incidente ya registrado",
                mensaje="Incidente ya registrado (sincronizado)",
            )

    vehiculo = obtener_vehiculo_de_cliente(db, vehiculo_id, cliente_actual.id)
    if vehiculo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehículo no encontrado para este cliente"
        )
    
    if prioridad not in ["baja", "media", "alta"]:
        prioridad = "media"
    
    tiene_texto = descripcion and descripcion.strip()
    tiene_audio = audio and audio.filename
    tiene_imagen = imagen_frontal and imagen_frontal.filename
    tiene_imagenes_extra = len(imagenes_adicionales) > 0 and any(img.filename for img in imagenes_adicionales if img)
    
    if not (tiene_texto or tiene_audio or tiene_imagen or tiene_imagenes_extra):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes proporcionar al menos una forma de describir el incidente: texto, audio o foto(s)"
        )
    
    if not tiene_texto and tiene_audio:
        descripcion = "Reporte enviado mediante audio (pendiente de transcripción)"
    
    transcripcion_audio = None
    archivo_audio_para_guardar = None
    
    if audio and audio.filename:
        try:
            resultado = await transcripcion_service.transcribir(audio)
            if not resultado.get("error"):
                transcripcion_audio = resultado.get("texto")
                archivo_audio_para_guardar = audio
        except Exception as e:
            archivo_audio_para_guardar = audio
    
    payload_incidente = IncidenteCrear(
        vehiculo_id=vehiculo_id,
        latitud=latitud,
        longitud=longitud,
        descripcion=descripcion or "",
        prioridad=prioridad,
        client_request_id=client_request_id,
    )

    incidente, analisis_ia = crear_incidente_con_ia(
        db,
        cliente_actual.id,
        payload_incidente,
        transcripcion_audio=transcripcion_audio
    )

    ruta_imagen_guardada = None
    
    if imagen_frontal and imagen_frontal.filename:
        ruta_imagen_guardada = guardar_evidencia_db(db, incidente.id, imagen_frontal, TipoEvidencia.IMAGEN)

    for img in imagenes_adicionales:
        if img and img.filename:
            guardar_evidencia_db(db, incidente.id, img, TipoEvidencia.IMAGEN)

    if archivo_audio_para_guardar and archivo_audio_para_guardar.filename:
        guardar_evidencia_db(db, incidente.id, archivo_audio_para_guardar, TipoEvidencia.AUDIO, transcripcion_audio)

    if ruta_imagen_guardada:
        try:
            vision_resultado = await vision_service.clasificar_imagen(ruta_imagen_guardada)
            descripcion_imagen = vision_resultado.get("descripcion_dano")

            if vision_resultado and vision_resultado.get("confianza", 0) > 0.5:
                incidente.clasificacion_ia = vision_resultado["clasificacion"]

            # Siempre enriquecemos el resumen si Gemini devolvió descripción del daño
            if descripcion_imagen or vision_resultado.get("confianza", 0) > 0.5:
                incidente.resumen_ia = generar_resumen_ia(
                    descripcion=descripcion or "",
                    clasificacion=incidente.clasificacion_ia or "incierto",
                    confianza=vision_resultado.get("confianza", 0.5),
                    transcripcion=transcripcion_audio,
                    descripcion_imagen=descripcion_imagen,
                )
                db.add(incidente)
                db.commit()
        except Exception as e:
            logger.warning(f"⚠️ Error en análisis de imagen: {e}")

    # Notificar a TODOS los talleres en 10 km sin crear asignación.
    # La asignación se creará cuando el cliente acepte una cotización.
    try:
        notificar_talleres_en_radio(db, incidente, radio_km=10.0)
    except Exception as e:
        logger.warning(f"⚠️ Error notificando talleres: {e}")

    return IncidenteReporteRespuesta(
        id=incidente.id,
        clasificacion_ia=incidente.clasificacion_ia or "incierto",
        prioridad=incidente.prioridad,
        resumen_ia=incidente.resumen_ia or "Análisis disponible próximamente",
        transcripcion_audio=transcripcion_audio,
    )


@router.get("")
def listar_incidentes(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[IncidenteDetalleRespuesta]:
    incidentes = obtener_incidentes_por_cliente(db, cliente_actual.id)
    return [IncidenteDetalleRespuesta.model_validate(i) for i in incidentes]


@router.patch("/{incidente_id}")
def gestionar_incidente(
    incidente_id: int,
    payload: IncidenteActualizarEstado,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> IncidenteDetalleRespuesta:
    incidente = obtener_incidente_por_id(db, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    try:
        actualizado = actualizar_estado_incidente(db, incidente, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    incidente_detalle = obtener_incidente_por_id(db, actualizado.id)
    return IncidenteDetalleRespuesta.model_validate(incidente_detalle)


# ============================================================
# ENDPOINT PARA OBTENER INCIDENTE ACTIVO DEL CLIENTE
# ============================================================

@router.get("/cliente/activo")
def obtener_incidente_activo_cliente(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """
    Obtiene el incidente activo del cliente (no finalizado ni cancelado).
    Estados activos: pendiente, taller_asignado, en_camino, en_proceso, atencion
    """
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.tecnico import Tecnico
    from app.models.taller import Taller
    
    incidente = db.query(Incidente).filter(
        Incidente.cliente_id == cliente_actual.id,
        Incidente.estado.in_(ESTADOS_ACTIVOS)
    ).order_by(Incidente.creado_en.desc()).first()
    
    if incidente is None:
        raise HTTPException(status_code=404, detail="No hay incidentes activos")
    
    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente.id
    ).first()
    
    tecnico_info = None
    taller_info = None
    tiempo_estimado_restante = None
    
    if asignacion:
        if asignacion.tecnico_id:
            tecnico = db.query(Tecnico).filter(Tecnico.id == asignacion.tecnico_id).first()
            if tecnico:
                tecnico_info = {
                    "id": tecnico.id,
                    "nombre": tecnico.nombre_completo,
                    "telefono": tecnico.telefono,
                    "especialidad": tecnico.especialidad,
                }
                
                if tecnico.latitud_actual and tecnico.longitud_actual:
                    distancia = calcular_distancia_km(
                        tecnico.latitud_actual, tecnico.longitud_actual,
                        incidente.latitud, incidente.longitud
                    )
                    tiempo_estimado_restante = int(distancia * 2)
        
        if asignacion.taller_id:
            taller = db.query(Taller).filter(Taller.id == asignacion.taller_id).first()
            if taller:
                taller_info = {
                    "id": taller.id,
                    "nombre": taller.nombre,
                    "telefono": taller.telefono,
                }
    
    return {
        "id": incidente.id,
        "cliente_id": incidente.cliente_id,
        "vehiculo_id": incidente.vehiculo_id,
        "latitud": incidente.latitud,
        "longitud": incidente.longitud,
        "descripcion": incidente.descripcion,
        "resumen_ia": incidente.resumen_ia,
        "clasificacion_ia": incidente.clasificacion_ia,
        "prioridad": incidente.prioridad,
        "estado": incidente.estado,
        "direccion_texto": incidente.direccion_texto,
        "creado_en": incidente.creado_en.isoformat(),
        "actualizado_en": incidente.actualizado_en.isoformat() if incidente.actualizado_en else None,
        "fecha_atencion": incidente.fecha_atencion.isoformat() if incidente.fecha_atencion else None,
        "fecha_finalizacion": incidente.fecha_finalizacion.isoformat() if incidente.fecha_finalizacion else None,
        "historial_estados": [
            {
                "estado_anterior": h.estado_anterior,
                "estado_nuevo": h.estado_nuevo,
                "fecha": h.creado_en.isoformat(),
                "observacion": h.observacion
            }
            for h in incidente.historial_estados
        ],
        "vehiculo": {
            "id": incidente.vehiculo.id,
            "marca": incidente.vehiculo.marca,
            "modelo": incidente.vehiculo.modelo,
            "placa": incidente.vehiculo.placa,
        } if incidente.vehiculo else None,
        "cliente": {
            "id": incidente.cliente.id,
            "nombre_completo": incidente.cliente.nombre_completo,
            "email": incidente.cliente.email,
            "telefono": incidente.cliente.telefono,
        } if incidente.cliente else None,
        "evidencias": [
            {
                "id": e.id,
                "tipo": e.tipo.value if hasattr(e.tipo, 'value') else str(e.tipo),
                "url_archivo": e.url_archivo,
                "transcripcion_texto": e.transcripcion_texto
            }
            for e in incidente.evidencias
        ] if incidente.evidencias else [],
        "tecnico": tecnico_info,
        "taller": taller_info,
        "tiempo_estimado_restante": tiempo_estimado_restante,
    }


# ============================================================
# ENDPOINT PARA OBTENER INCIDENTE POR ID (PARA TALLERES)
# ============================================================

@router.get("/{incidente_id}")
def obtener_incidente_por_id_endpoint(
    incidente_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> IncidenteDetalleRespuesta:
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.vehiculo import Vehiculo
    from app.models.cliente import Cliente
    
    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente_id,
        AsignacionTaller.taller_id == taller_actual.id
    ).first()
    
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado o no asignado a este taller"
        )
    
    incidente = db.query(Incidente).options(
        selectinload(Incidente.vehiculo),
        selectinload(Incidente.cliente),
        selectinload(Incidente.evidencias)
    ).filter(Incidente.id == incidente_id).first()
    
    if incidente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado"
        )
    
    result = IncidenteDetalleRespuesta(
        id=incidente.id,
        cliente_id=incidente.cliente_id,
        vehiculo_id=incidente.vehiculo_id,
        latitud=incidente.latitud,
        longitud=incidente.longitud,
        descripcion=incidente.descripcion,
        prioridad=incidente.prioridad,
        estado=incidente.estado,
        clasificacion_ia=incidente.clasificacion_ia,
        resumen_ia=incidente.resumen_ia,
        transcripcion_audio=getattr(incidente, 'transcripcion_audio', None),
        creado_en=incidente.creado_en,
        actualizado_en=incidente.actualizado_en,
        historial_estados=[],
        vehiculo=None,
        cliente=None,
        evidencias=[],
    )
    
    if incidente.vehiculo:
        result.vehiculo = VehiculoBasicoRespuesta(
            id=incidente.vehiculo.id,
            marca=incidente.vehiculo.marca,
            modelo=incidente.vehiculo.modelo,
            placa=incidente.vehiculo.placa,
            anio=getattr(incidente.vehiculo, 'anio', None),
            color=getattr(incidente.vehiculo, 'color', None),
        )
    
    if incidente.cliente:
        result.cliente = ClienteBasicoRespuesta(
            id=incidente.cliente.id,
            nombre_completo=incidente.cliente.nombre_completo,
            email=incidente.cliente.email,
            telefono=incidente.cliente.telefono,
            creado_en=incidente.cliente.creado_en,
        )
    
    if incidente.evidencias:
        from app.schemas.evidencia import EvidenciaRespuesta
        result.evidencias = [EvidenciaRespuesta.model_validate(e) for e in incidente.evidencias]
    
    return result


# ============================================================
# ENDPOINT PARA CLIENTES: Obtener incidente por ID (con técnico y taller)
# ============================================================

@router.get("/cliente/{incidente_id}")
def obtener_incidente_cliente_detalle(
    incidente_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.tecnico import Tecnico
    from app.models.taller import Taller
    
    incidente = db.query(Incidente).options(
        selectinload(Incidente.vehiculo),
        selectinload(Incidente.cliente),
        selectinload(Incidente.evidencias),
        selectinload(Incidente.historial_estados)
    ).filter(
        Incidente.id == incidente_id,
        Incidente.cliente_id == cliente_actual.id
    ).first()
    
    if incidente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado"
        )
    
    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente_id
    ).first()
    
    tecnico_info = None
    taller_info = None
    
    if asignacion:
        if asignacion.tecnico_id:
            tecnico = db.query(Tecnico).filter(Tecnico.id == asignacion.tecnico_id).first()
            if tecnico:
                tecnico_info = {
                    "nombre": tecnico.nombre_completo,
                    "telefono": tecnico.telefono,
                    "especialidad": tecnico.especialidad
                }
        
        if asignacion.taller_id:
            taller = db.query(Taller).filter(Taller.id == asignacion.taller_id).first()
            if taller:
                taller_info = {
                    "nombre": taller.nombre,
                    "telefono": taller.telefono
                }
    
    return {
        "id": incidente.id,
        "cliente_id": incidente.cliente_id,
        "vehiculo_id": incidente.vehiculo_id,
        "latitud": incidente.latitud,
        "longitud": incidente.longitud,
        "descripcion": incidente.descripcion,
        "resumen_ia": incidente.resumen_ia,
        "clasificacion_ia": incidente.clasificacion_ia,
        "prioridad": incidente.prioridad,
        "estado": incidente.estado,
        "direccion_texto": incidente.direccion_texto,
        "creado_en": incidente.creado_en.isoformat(),
        "actualizado_en": incidente.actualizado_en.isoformat() if incidente.actualizado_en else None,
        "fecha_atencion": incidente.fecha_atencion.isoformat() if incidente.fecha_atencion else None,
        "fecha_finalizacion": incidente.fecha_finalizacion.isoformat() if incidente.fecha_finalizacion else None,
        "historial_estados": [
            {
                "estado_anterior": h.estado_anterior,
                "estado_nuevo": h.estado_nuevo,
                "fecha": h.creado_en.isoformat(),
                "observacion": h.observacion
            }
            for h in incidente.historial_estados
        ],
        "vehiculo": {
            "id": incidente.vehiculo.id,
            "marca": incidente.vehiculo.marca,
            "modelo": incidente.vehiculo.modelo,
            "placa": incidente.vehiculo.placa,
        } if incidente.vehiculo else None,
        "cliente": {
            "id": incidente.cliente.id,
            "nombre_completo": incidente.cliente.nombre_completo,
            "email": incidente.cliente.email,
            "telefono": incidente.cliente.telefono,
        } if incidente.cliente else None,
        "evidencias": [
            {
                "id": e.id,
                "tipo": e.tipo.value if hasattr(e.tipo, 'value') else str(e.tipo),
                "url_archivo": e.url_archivo,
                "transcripcion_texto": e.transcripcion_texto
            }
            for e in incidente.evidencias
        ] if incidente.evidencias else [],
        "tecnico": tecnico_info,
        "taller": taller_info
    }


# ============================================================
# ENDPOINT: Incidentes atendidos SIN facturar (CORREGIDO)
# ============================================================

@router.get("/atendidos/sin-facturar")
def listar_incidentes_atendidos_sin_facturar(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Lista incidentes atendidos/finalizados que aún no tienen una factura REAL (total > 0).
    """
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.factura import Factura
    from app.models.vehiculo import Vehiculo
    from app.models.cliente import Cliente
    
    # Subconsulta: incidentes que tienen factura REAL (total > 0)
    facturas_con_total = select(Factura.incidente_id).where(Factura.total > 0).subquery()
    
    consulta = select(
        Incidente.id,
        Cliente.nombre_completo.label("cliente_nombre"),
        Cliente.email.label("cliente_email"),
        Vehiculo.marca.label("vehiculo"),
        Vehiculo.placa.label("placa"),
        Incidente.clasificacion_ia,
        Incidente.fecha_atencion
    ).join(
        AsignacionTaller, AsignacionTaller.incidente_id == Incidente.id
    ).join(
        Cliente, Cliente.id == Incidente.cliente_id
    ).join(
        Vehiculo, Vehiculo.id == Incidente.vehiculo_id
    ).where(
        AsignacionTaller.taller_id == taller_actual.id,
        # ✅ BUSCAR "atendido" O "finalizado"
        Incidente.estado.in_(["atendido", "finalizado"]),
        # Excluir solo incidentes que ya tienen una factura CON TOTAL > 0
        Incidente.id.notin_(select(facturas_con_total))
    ).order_by(Incidente.fecha_atencion.desc())
    
    resultados = db.execute(consulta).all()
    
    return [
        {
            "id": r[0],
            "cliente_nombre": r[1],
            "cliente_email": r[2],
            "vehiculo": r[3],
            "placa": r[4],
            "clasificacion_ia": r[5],
            "fecha_atencion": r[6].isoformat() if r[6] else None
        }
        for r in resultados
    ]


# ============================================================
# ENDPOINT: Incidentes disponibles para cotizar (taller)
# ============================================================

@router.get("/taller/disponibles")
def incidentes_disponibles_para_cotizar(
    radio_km: float = 10.0,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Incidentes en estado 'pendiente' dentro del radio del taller
    que aún no tienen cotización aceptada.
    Incluye si el taller ya envió su propia cotización.
    """
    from app.models.incidente import Incidente
    from app.models.cotizacion import Cotizacion as CotizacionModel

    if not taller_actual.latitud or not taller_actual.longitud:
        return []

    incidentes = (
        db.query(Incidente)
        .options(
            selectinload(Incidente.vehiculo),
            selectinload(Incidente.cliente),
            selectinload(Incidente.evidencias),
        )
        .filter(Incidente.estado == "pendiente")
        .order_by(Incidente.creado_en.desc())
        .all()
    )

    resultado = []
    for inc in incidentes:
        dist = calcular_distancia_km(
            taller_actual.latitud, taller_actual.longitud,
            inc.latitud, inc.longitud,
        )
        if dist > radio_km:
            continue

        # Verificar si ya hay una cotización aceptada (incidente ya tomado)
        ya_aceptada = db.query(CotizacionModel).filter(
            CotizacionModel.incidente_id == inc.id,
            CotizacionModel.estado == "aceptada",
        ).first()
        if ya_aceptada:
            continue

        # Cotización propia del taller para este incidente
        mi_cot = db.query(CotizacionModel).filter(
            CotizacionModel.incidente_id == inc.id,
            CotizacionModel.taller_id == taller_actual.id,
        ).first()

        resultado.append({
            "id": inc.id,
            "latitud": inc.latitud,
            "longitud": inc.longitud,
            "descripcion": inc.descripcion,
            "clasificacion_ia": inc.clasificacion_ia,
            "resumen_ia": inc.resumen_ia,
            "prioridad": inc.prioridad,
            "estado": inc.estado,
            "creado_en": inc.creado_en.isoformat(),
            "distancia_km": round(dist, 2),
            "cliente": {
                "nombre_completo": inc.cliente.nombre_completo,
                "telefono": inc.cliente.telefono,
            } if inc.cliente else None,
            "vehiculo": {
                "marca": inc.vehiculo.marca,
                "modelo": inc.vehiculo.modelo,
                "placa": inc.vehiculo.placa,
            } if inc.vehiculo else None,
            "evidencias": [
                {
                    "tipo": e.tipo.value if hasattr(e.tipo, "value") else str(e.tipo),
                    "url_archivo": e.url_archivo,
                }
                for e in inc.evidencias
            ] if inc.evidencias else [],
            "mi_cotizacion": {
                "id": mi_cot.id,
                "estado": mi_cot.estado,
                "monto_total": mi_cot.monto_total,
                "tiempo_estimado_reparacion_minutos": mi_cot.tiempo_estimado_reparacion_minutos,
            } if mi_cot else None,
        })

    return sorted(resultado, key=lambda x: x["distancia_km"])


# ============================================================
# ENDPOINT: Historial de incidentes para taller
# ============================================================

@router.get("/taller/historial")
def listar_historial_taller(
    skip: int = 0,
    limit: int = 100,
    estado: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.cliente import Cliente
    from app.models.vehiculo import Vehiculo
    
    query = db.query(Incidente).join(
        AsignacionTaller, AsignacionTaller.incidente_id == Incidente.id
    ).filter(
        AsignacionTaller.taller_id == taller_actual.id
    )
    
    if estado and estado != "todos":
        query = query.filter(Incidente.estado == estado)
    
    if fecha_desde:
        fecha_desde_dt = datetime.fromisoformat(fecha_desde)
        query = query.filter(Incidente.creado_en >= fecha_desde_dt)
    
    if fecha_hasta:
        fecha_hasta_dt = datetime.fromisoformat(fecha_hasta)
        query = query.filter(Incidente.creado_en <= fecha_hasta_dt)
    
    query = query.order_by(Incidente.creado_en.desc()).offset(skip).limit(limit)
    
    incidentes = query.all()
    
    resultado = []
    for inc in incidentes:
        historial = [
            {
                "estado_anterior": h.estado_anterior,
                "estado_nuevo": h.estado_nuevo,
                "fecha": h.creado_en.isoformat(),
                "observacion": h.observacion
            }
            for h in inc.historial_estados
        ]
        
        resultado.append({
            "id": inc.id,
            "cliente": {
                "nombre": inc.cliente.nombre_completo,
                "email": inc.cliente.email,
                "telefono": inc.cliente.telefono
            } if inc.cliente else None,
            "vehiculo": {
                "marca": inc.vehiculo.marca,
                "modelo": inc.vehiculo.modelo,
                "placa": inc.vehiculo.placa
            } if inc.vehiculo else None,
            "clasificacion_ia": inc.clasificacion_ia,
            "prioridad": inc.prioridad,
            "estado": inc.estado,
            "descripcion": inc.descripcion,
            "direccion": inc.direccion_texto,
            "fecha_creacion": inc.creado_en.isoformat(),
            "fecha_atencion": inc.fecha_atencion.isoformat() if inc.fecha_atencion else None,
            "fecha_finalizacion": inc.fecha_finalizacion.isoformat() if inc.fecha_finalizacion else None,
            "historial": historial
        })
    
    return resultado


# ============================================================
# ENDPOINT PARA ACTUALIZAR ESTADO DEL INCIDENTE (TÉCNICO)
# ============================================================

@router.patch("/{incidente_id}/estado")
async def actualizar_estado_incidente_tecnico(
    incidente_id: int,
    payload: IncidenteActualizarEstado,
    db: Session = Depends(get_db),
    tecnico_actual: Tecnico = Depends(obtener_tecnico_actual),
):
    """
    Actualiza el estado de un incidente (usado por el técnico).
    Estados posibles: pendiente, en_camino, atencion, finalizado
    """
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.historial_estado_incidente import HistorialEstadoIncidente
    from app.services.websocket_manager import manager
    from app.services.pago_servicio import crear_factura_automatica
    
    incidente = db.query(Incidente).filter(Incidente.id == incidente_id).first()
    if incidente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado"
        )
    
    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente_id,
        AsignacionTaller.tecnico_id == tecnico_actual.id
    ).first()
    
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar este incidente"
        )
    
    estado_anterior = incidente.estado
    estado_nuevo = payload.estado
    
    transiciones_permitidas = {
        "pendiente":       ["en_camino"],
        "taller_asignado": ["en_camino"],
        "en_camino":       ["atencion", "finalizado"],
        "atencion":        ["finalizado"],
    }
    
    if estado_nuevo not in transiciones_permitidas.get(estado_anterior, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transición no permitida: {estado_anterior} → {estado_nuevo}"
        )
    
    if estado_nuevo == "en_camino" and incidente.fecha_atencion is None:
        incidente.fecha_atencion = datetime.now(timezone.utc)
    elif estado_nuevo == "finalizado" and incidente.fecha_finalizacion is None:
        incidente.fecha_finalizacion = datetime.now(timezone.utc)
    
    incidente.estado = estado_nuevo
    incidente.actualizado_en = datetime.now(timezone.utc)
    
    historial = HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        observacion=f"Actualizado por técnico: {tecnico_actual.nombre_completo}",
        usuario_que_cambio=f"tecnico_{tecnico_actual.id}",
    )
    db.add(historial)
    
    # 🔥 Crear factura automática si el estado es "finalizado"
    if estado_nuevo == "finalizado":
        crear_factura_automatica(db, incidente.id, asignacion.taller_id)

    db.commit()
    db.refresh(incidente)

    # 🌟 Solicitar reseña al cliente cuando el servicio finaliza
    if estado_nuevo == "finalizado" and incidente.cliente_id:
        try:
            from app.services.notificacion_servicio import crear_notificacion, enviar_push_a_cliente
            from app.schemas.notificacion import NotificacionCrear, TipoNotificacionEnum
            import json as _json

            _notif_resena = NotificacionCrear(
                cliente_id=incidente.cliente_id,
                incidente_id=incidente.id,
                tipo=TipoNotificacionEnum.SOLICITAR_RESENA,
                titulo="⭐ ¿Cómo fue tu experiencia?",
                mensaje="El servicio ha finalizado. Tómate un momento para calificar al taller y al técnico.",
                datos_extra_json=_json.dumps({
                    "incidente_id": incidente.id,
                    "taller_id": asignacion.taller_id,
                    "tipo": "solicitar_resena",
                }),
            )
            crear_notificacion(db, _notif_resena)

            enviar_push_a_cliente(
                db=db,
                cliente_id=incidente.cliente_id,
                titulo="⭐ ¿Cómo fue tu experiencia?",
                cuerpo="El servicio ha finalizado. ¡Califica al taller y al técnico!",
                datos={
                    "tipo": "solicitar_resena",
                    "incidente_id": str(incidente.id),
                    "taller_id": str(asignacion.taller_id),
                },
            )
        except Exception as _e:
            print(f"⚠️ Error enviando notificación de reseña: {_e}")

    await manager.broadcast_estado_incidente(
        incidente_id=incidente.id,
        estado=estado_nuevo,
        taller_id=asignacion.taller_id,
        cliente_id=incidente.cliente_id,
        data_extra={
            "tecnico_nombre": tecnico_actual.nombre_completo,
        }
    )
    
    return {"success": True, "estado": incidente.estado, "mensaje": "Estado actualizado correctamente"}


# ============================================================
# CANCELAR INCIDENTE — CLIENTE
# ============================================================

class CancelarPayload(BaseModel):
    motivo: Optional[str] = None


@router.patch("/{incidente_id}/cancelar")
async def cancelar_incidente_cliente(
    incidente_id: int,
    payload: CancelarPayload = Body(default=CancelarPayload()),
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """El cliente cancela su emergencia (solo en estado pendiente o taller_asignado)."""
    from app.models.incidente import Incidente
    from app.models.historial_estado_incidente import HistorialEstadoIncidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.services.websocket_manager import manager

    CANCELABLES = {"pendiente", "taller_asignado"}

    incidente = db.query(Incidente).filter(
        Incidente.id == incidente_id,
        Incidente.cliente_id == cliente_actual.id,
    ).first()

    if not incidente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    if incidente.estado not in CANCELABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No puedes cancelar una emergencia en estado '{incidente.estado}'. Solo se puede cancelar cuando está pendiente o recién asignada.",
        )

    estado_anterior = incidente.estado
    incidente.estado = "cancelado"
    incidente.actualizado_en = datetime.now(timezone.utc)

    db.add(HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_anterior,
        estado_nuevo="cancelado",
        observacion=payload.motivo or "Cancelado por el cliente",
        usuario_que_cambio=f"cliente_{cliente_actual.id}",
    ))
    db.commit()

    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente_id
    ).first()

    await manager.broadcast_estado_incidente(
        incidente_id=incidente.id,
        estado="cancelado",
        taller_id=asignacion.taller_id if asignacion else None,
        cliente_id=incidente.cliente_id,
        data_extra={"motivo": payload.motivo or "Cancelado por el cliente"},
    )

    return {"success": True, "mensaje": "Emergencia cancelada correctamente"}


# ============================================================
# CANCELAR INCIDENTE — TALLER
# ============================================================

@router.patch("/{incidente_id}/cancelar-taller")
async def cancelar_incidente_taller(
    incidente_id: int,
    payload: CancelarPayload = Body(default=CancelarPayload()),
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """El taller cancela un incidente activo asignado a él."""
    from app.models.incidente import Incidente
    from app.models.historial_estado_incidente import HistorialEstadoIncidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.services.websocket_manager import manager

    CANCELABLES = {"pendiente", "taller_asignado", "en_camino", "atencion"}

    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente_id,
        AsignacionTaller.taller_id == taller_actual.id,
    ).first()

    if not asignacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado o no asignado a este taller")

    incidente = db.query(Incidente).filter(Incidente.id == incidente_id).first()
    if not incidente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    if incidente.estado not in CANCELABLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede cancelar un incidente en estado '{incidente.estado}'",
        )

    estado_anterior = incidente.estado
    incidente.estado = "cancelado"
    incidente.actualizado_en = datetime.now(timezone.utc)

    db.add(HistorialEstadoIncidente(
        incidente_id=incidente.id,
        estado_anterior=estado_anterior,
        estado_nuevo="cancelado",
        observacion=payload.motivo or f"Cancelado por el taller: {taller_actual.nombre}",
        usuario_que_cambio=f"taller_{taller_actual.id}",
    ))
    db.commit()

    await manager.broadcast_estado_incidente(
        incidente_id=incidente.id,
        estado="cancelado",
        taller_id=taller_actual.id,
        cliente_id=incidente.cliente_id,
        data_extra={"motivo": payload.motivo or "Cancelado por el taller"},
    )

    return {"success": True, "mensaje": "Incidente cancelado correctamente"}