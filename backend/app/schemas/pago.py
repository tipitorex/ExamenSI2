from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ========== ENUMS ==========

class EstadoPagoEnum(str, Enum):
    PENDIENTE = "pendiente"
    COMPLETADO = "completado"
    FALLIDO = "fallido"
    REEMBOLSADO = "reembolsado"


class EstadoFacturaEnum(str, Enum):
    PENDIENTE = "pendiente"
    PAGADA = "pagada"
    CANCELADA = "cancelada"


# ========== CLIENTE Y TALLER (para incluir en factura) ==========

class ClienteBasicoFactura(BaseModel):
    """Datos básicos del cliente para incluir en la factura"""
    nombre_completo: str
    email: str
    telefono: Optional[str] = None


class TallerBasicoFactura(BaseModel):
    """Datos básicos del taller para incluir en la factura"""
    nombre: str


# ========== CONCEPTOS DE FACTURA ==========

class ConceptoFacturaCrear(BaseModel):
    concepto: str = Field(..., max_length=200, min_length=1, description="Descripción del servicio/producto")
    cantidad: float = Field(..., gt=0, description="Cantidad (ej: 2 horas, 1 llanta)")
    precio_unitario: float = Field(..., ge=0, description="Precio por unidad")


class ConceptoFacturaRespuesta(BaseModel):
    id: int
    concepto: str
    cantidad: float
    precio_unitario: float
    subtotal: float
    
    class Config:
        from_attributes = True


# ========== FACTURAS ==========

class FacturaCrear(BaseModel):
    incidente_id: int = Field(..., gt=0, description="ID del incidente atendido")
    conceptos: List[ConceptoFacturaCrear] = Field(..., min_length=1, description="Lista de conceptos a facturar")
    notas_internas: Optional[str] = Field(None, max_length=500, description="Notas privadas del taller")


class FacturaRespuesta(BaseModel):
    id: int
    incidente_id: int
    taller_id: int
    cliente_id: int
    numero_factura: str
    total: float
    comision_plataforma: float  # 10%
    monto_neto_taller: float    # 90%
    estado: EstadoFacturaEnum
    url_pago: Optional[str] = None
    creado_en: datetime
    pagado_en: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class FacturaDetalleRespuesta(FacturaRespuesta):
    conceptos: List[ConceptoFacturaRespuesta]
    notas_internas: Optional[str] = None
    pagos: List["PagoRespuesta"] = []
    # ✅ NUEVOS CAMPOS - Datos del cliente y taller
    cliente: Optional[ClienteBasicoFactura] = None
    taller: Optional[TallerBasicoFactura] = None


class FacturaListaRespuesta(BaseModel):
    id: int
    numero_factura: str
    incidente_id: int
    total: float
    estado: EstadoFacturaEnum
    creado_en: datetime


# ========== PAGOS (tus schemas existentes + nuevos campos) ==========

class PagoCrear(BaseModel):
    factura_id: Optional[int] = None
    monto: float = Field(gt=0)
    metodo_pago: str | None = Field(default=None, max_length=50)
    stripe_session_id: Optional[str] = None


class PagoActualizar(BaseModel):
    estado: EstadoPagoEnum | None = None
    metodo_pago: str | None = Field(default=None, max_length=50)
    referencia_pago: str | None = Field(default=None, max_length=255)
    stripe_payment_intent_id: Optional[str] = None


class PagoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente_id: int
    incidente_id: int
    factura_id: Optional[int] = None
    monto: float
    comision_plataforma: float
    monto_para_taller: float
    estado: EstadoPagoEnum
    metodo_pago: str | None
    referencia_pago: str | None
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    fecha_pago: datetime | None
    fecha_creacion: datetime


# ========== PAGO CON STRIPE (ACTUALIZADO) ==========

class IniciarPagoRequest(BaseModel):
    factura_id: int = Field(..., gt=0)
    success_url: str = Field(..., description="URL a donde redirigir tras pago exitoso")
    cancel_url: str = Field(..., description="URL a donde redirigir si cancela el pago")


class IniciarPagoResponse(BaseModel):
    """Respuesta para iniciar pago con Stripe PaymentIntent"""
    payment_intent_client_secret: str = Field(..., description="Client secret del PaymentIntent para Flutter")
    factura_id: int = Field(..., description="ID de la factura")
    pago_id: int = Field(..., description="ID del pago registrado")


class VerificarPagoResponse(BaseModel):
    pagado: bool
    factura_id: int
    estado: str
    mensaje: str


# ========== EVITAR ERROR DE REFERENCIA CIRCULAR ==========
# Actualizar la referencia de PagoRespuesta en FacturaDetalleRespuesta
FacturaDetalleRespuesta.model_rebuild()