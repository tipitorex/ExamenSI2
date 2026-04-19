import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.models.evidencia import Evidencia, TipoEvidencia
from app.schemas.incidente import (
    IncidenteActualizarEstado,
    IncidenteCrear,
    IncidenteDetalleRespuesta,
    IncidenteReporteRespuesta,
)
from app.services.incidente_servicio import (
    actualizar_estado_incidente,
    crear_incidente_con_ia,
    obtener_incidente_por_id,
    obtener_incidentes_por_cliente,
    obtener_vehiculo_de_cliente,
)

router = APIRouter()

# Configurar directorio para guardar evidencias
MEDIA_DIR = "media/evidencias"
os.makedirs(MEDIA_DIR, exist_ok=True)


def guardar_evidencia_db(db: Session, incidente_id: int, file: UploadFile, tipo: TipoEvidencia) -> str | None:
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
    
    # Registrar en BD
    evidencia = Evidencia(
        incidente_id=incidente_id,
        tipo=tipo,
        url_archivo=ruta_completa,
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
    
    # 3. Crear payload y aplicar IA
    class Payload:
        pass
    
    payload = Payload()
    payload.vehiculo_id = vehiculo_id
    payload.latitud = latitud
    payload.longitud = longitud
    payload.descripcion = descripcion
    payload.prioridad = prioridad
    
    incidente, analisis_ia = crear_incidente_con_ia(db, cliente_actual.id, payload)
    
    # 4. Guardar evidencias
    if imagen_frontal and imagen_frontal.filename:
        guardar_evidencia_db(db, incidente.id, imagen_frontal, TipoEvidencia.IMAGEN)
    
    for img in imagenes_adicionales:
        if img and img.filename:
            guardar_evidencia_db(db, incidente.id, img, TipoEvidencia.IMAGEN)
    
    if audio and audio.filename:
        guardar_evidencia_db(db, incidente.id, audio, TipoEvidencia.AUDIO)
    
    # 5. Retornar respuesta con análisis IA
    return IncidenteReporteRespuesta(
        id=incidente.id,
        clasificacion_ia=incidente.clasificacion_ia or "incierto",
        prioridad=incidente.prioridad,
        resumen_ia=incidente.resumen_ia or "Análisis disponible próximamente",
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