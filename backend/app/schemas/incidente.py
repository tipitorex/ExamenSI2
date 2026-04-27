from datetime import datetime
from typing import Literal, Optional, List

from pydantic import BaseModel, ConfigDict, Field

EstadoIncidente = Literal["pendiente", "en_proceso", "atendido", "cerrado", "cancelado"]
PrioridadIncidente = Literal["baja", "media", "alta"]


# ============================================================
# SCHEMAS PARA VEHÍCULO Y CLIENTE (anidados)
# ============================================================
class VehiculoBasicoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    marca: str
    modelo: str
    placa: str
    anio: Optional[int] = None
    color: Optional[str] = None


class ClienteBasicoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    nombre_completo: str
    email: str
    telefono: Optional[str] = None
    creado_en: datetime
    
    @property
    def nombre(self) -> str:
        return self.nombre_completo


# ============================================================
# SCHEMAS PARA EVIDENCIAS
# ============================================================
class EvidenciaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    incidente_id: int
    tipo: str
    url_archivo: str
    transcripcion_texto: Optional[str] = None
    analisis_ia: Optional[str] = None
    fecha_subida: datetime


# ============================================================
# SCHEMAS PRINCIPALES DE INCIDENTES
# ============================================================
class IncidenteCrear(BaseModel):
    vehiculo_id: int
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    # ✅ descripcion ahora es OPCIONAL y sin validación de mínimo
    descripcion: Optional[str] = Field(None, max_length=2000, description="Descripción del incidente (opcional)")
    prioridad: PrioridadIncidente = "media"


class IncidenteActualizarEstado(BaseModel):
    estado: str


class HistorialEstadoIncidenteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incidente_id: int
    estado_anterior: str | None
    estado_nuevo: str
    observacion: str | None
    creado_en: datetime


class IncidenteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    vehiculo_id: int
    latitud: float
    longitud: float
    descripcion: str
    prioridad: str
    estado: str
    clasificacion_ia: str | None
    resumen_ia: str | None
    transcripcion_audio: str | None = None
    creado_en: datetime
    actualizado_en: datetime


class IncidenteDetalleRespuesta(IncidenteRespuesta):
    """Incidente con datos completos incluyendo vehículo, cliente, historial y evidencias"""
    historial_estados: List[HistorialEstadoIncidenteRespuesta] = []
    vehiculo: Optional[VehiculoBasicoRespuesta] = None
    cliente: Optional[ClienteBasicoRespuesta] = None
    evidencias: List[EvidenciaRespuesta] = []


class IncidenteReporteRespuesta(BaseModel):
    """Respuesta específica para el POST de reporte"""
    id: int
    clasificacion_ia: str
    prioridad: str
    resumen_ia: str
    transcripcion_audio: str | None = None 
    mensaje: str = "Incidente reportado correctamente"