import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.api.deps import get_db, obtener_cliente_actual, obtener_taller_actual
from app.models.cliente import Cliente
from app.models.taller import Taller
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
from app.services.asignacion_taller_servicio import asignar_taller_mas_cercano
from app.services.transcripcion_servicio import transcripcion_service

router = APIRouter()

# Configurar directorio para guardar evidencias
MEDIA_DIR = "media/evidencias"
os.makedirs(MEDIA_DIR, exist_ok=True)


def guardar_evidencia_db(db: Session, incidente_id: int, file: UploadFile, tipo: TipoEvidencia, transcripcion: str = None) -> str | None:
    """Guarda un archivo en disco y registra la evidencia en BD."""
    if not file or not file.filename:
        return None
    
    # Generar nombre único
    import uuid
    extension = os.path.splitext(file.filename)[1]
    nombre_archivo = f"{uuid.uuid4().hex}{extension}"
    ruta_completa = os.path.join(MEDIA_DIR, nombre_archivo)
    
    # Guardar en disco
    try:
        contenido = file.file.read()
        with open(ruta_completa, "wb") as f:
            f.write(contenido)
    except Exception as e:
        print(f"Error guardando archivo: {e}")
        return None
    
    # Registrar en BD (con transcripción si es audio)
    evidencia = Evidencia(
        incidente_id=incidente_id,
        tipo=tipo,
        url_archivo=ruta_completa,
        transcripcion_texto=transcripcion,
    )
    db.add(evidencia)
    db.commit()
    
    return ruta_completa


@router.post("", response_model=IncidenteReporteRespuesta)
async def reportar_incidente(
    vehiculo_id: int = Form(...),
    latitud: float = Form(...),
    longitud: float = Form(...),
    descripcion: str = Form(...),
    prioridad: str = Form("media"),
    imagen_frontal: UploadFile = File(None),
    imagenes_adicionales: List[UploadFile] = File([]),
    audio: UploadFile = File(None),
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    # 1. Validar vehículo
    vehiculo = obtener_vehiculo_de_cliente(db, vehiculo_id, cliente_actual.id)
    if vehiculo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Vehículo no encontrado para este cliente"
        )
    
    # 2. Validar prioridad
    if prioridad not in ["baja", "media", "alta"]:
        prioridad = "media"
    
    # 3. PRIMERO: Procesar audio y obtener transcripción (antes de crear incidente)
    transcripcion_audio = None
    archivo_audio_para_guardar = None
    
    if audio and audio.filename:
        try:
            print(f"🎤 Procesando audio: {audio.filename}")
            resultado = await transcripcion_service.transcribir(audio)
            
            if resultado.get("error"):
                print(f"⚠️ Error en transcripción: {resultado['error']}")
            else:
                transcripcion_audio = resultado.get("texto")
                print(f"✅ Transcripción obtenida: {transcripcion_audio[:100]}...")
                print(f"📊 Idioma: {resultado.get('idioma')}")
                print(f"⏱️ Duración: {resultado.get('duracion_segundos')} segundos")
                
                # Guardar referencia del audio para guardarlo después
                archivo_audio_para_guardar = audio
                
        except Exception as e:
            print(f"❌ Error al transcribir audio: {e}")
            # No falla el registro si falla la transcripción
            archivo_audio_para_guardar = audio
    
    # 4. Crear payload para incidente
    payload_incidente = IncidenteCrear(
        vehiculo_id=vehiculo_id,
        latitud=latitud,
        longitud=longitud,
        descripcion=descripcion,
        prioridad=prioridad,
    )
    
    # 5. Crear incidente CON la transcripción (si existe)
    incidente, analisis_ia = crear_incidente_con_ia(
        db, 
        cliente_actual.id, 
        payload_incidente,
        transcripcion_audio=transcripcion_audio
    )

    # 6. Guardar evidencias (después de tener el incidente_id)
    if imagen_frontal and imagen_frontal.filename:
        guardar_evidencia_db(db, incidente.id, imagen_frontal, TipoEvidencia.IMAGEN)

    for img in imagenes_adicionales:
        if img and img.filename:
            guardar_evidencia_db(db, incidente.id, img, TipoEvidencia.IMAGEN)

    if archivo_audio_para_guardar and archivo_audio_para_guardar.filename:
        # Guardar audio con su transcripción
        guardar_evidencia_db(db, incidente.id, archivo_audio_para_guardar, TipoEvidencia.AUDIO, transcripcion_audio)

    # 7. Asignar automáticamente el taller más cercano
    asignacion = asignar_taller_mas_cercano(db, incidente)

    # 8. Retornar respuesta con análisis IA y transcripción
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
# ENDPOINT PARA OBTENER INCIDENTE POR ID (PARA TALLERES)
# ============================================================
@router.get("/{incidente_id}")
def obtener_incidente_por_id_endpoint(
    incidente_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> IncidenteDetalleRespuesta:
    """
    Obtener un incidente específico por su ID.
    Acceso permitido para talleres (para ver detalles de asignaciones)
    """
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.vehiculo import Vehiculo
    from app.models.cliente import Cliente
    
    # Verificar que el taller tiene acceso a este incidente a través de una asignación
    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == incidente_id,
        AsignacionTaller.taller_id == taller_actual.id
    ).first()
    
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado o no asignado a este taller"
        )
    
    # Obtener incidente con relaciones cargadas usando selectinload
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
    
    # Construir respuesta manualmente
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
    
    # Agregar datos del vehículo si existe
    if incidente.vehiculo:
        result.vehiculo = VehiculoBasicoRespuesta(
            id=incidente.vehiculo.id,
            marca=incidente.vehiculo.marca,
            modelo=incidente.vehiculo.modelo,
            placa=incidente.vehiculo.placa,
            anio=getattr(incidente.vehiculo, 'anio', None),
            color=getattr(incidente.vehiculo, 'color', None),
        )
    
    # Agregar datos del cliente si existe
    if incidente.cliente:
        result.cliente = ClienteBasicoRespuesta(
            id=incidente.cliente.id,
            nombre_completo=incidente.cliente.nombre_completo,
            email=incidente.cliente.email,
            telefono=incidente.cliente.telefono,
            creado_en=incidente.cliente.creado_en,
        )
    
    # Agregar evidencias
    if incidente.evidencias:
        from app.schemas.evidencia import EvidenciaRespuesta
        result.evidencias = [EvidenciaRespuesta.model_validate(e) for e in incidente.evidencias]
    
    return result


# ============================================================
# NUEVO ENDPOINT: Incidentes atendidos SIN facturar (para taller)
# ============================================================
@router.get("/atendidos/sin-facturar")
def listar_incidentes_atendidos_sin_facturar(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Lista incidentes atendidos por el taller que aún no tienen factura.
    """
    from app.models.incidente import Incidente
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.factura import Factura
    from app.models.vehiculo import Vehiculo
    from app.models.cliente import Cliente
    
    # Subconsulta para incidentes que ya tienen factura
    incidentes_con_factura = select(Factura.incidente_id).subquery()
    
    # Incidentes atendidos del taller sin factura
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
        Incidente.estado == "atendido",
        Incidente.id.notin_(select(incidentes_con_factura))
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