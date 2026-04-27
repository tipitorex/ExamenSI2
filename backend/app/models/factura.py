from datetime import datetime
from typing import List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import enum

from app.db.base import Base


class EstadoFacturaEnum(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADA = "pagada"
    CANCELADA = "cancelada"


class Factura(Base):
    __tablename__ = "facturas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(
        ForeignKey("incidentes.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True, 
        unique=True
    )
    taller_id: Mapped[int] = mapped_column(
        ForeignKey("talleres.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("clientes.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    numero_factura: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    total: Mapped[float] = mapped_column(Float, nullable=False)
    comision_plataforma: Mapped[float] = mapped_column(Float, nullable=False)
    monto_neto_taller: Mapped[float] = mapped_column(Float, nullable=False)
    
    estado: Mapped[EstadoFacturaEnum] = mapped_column(
        SqlEnum(EstadoFacturaEnum, name="estado_factura_enum"),
        default=EstadoFacturaEnum.PENDIENTE,
        nullable=False
    )
    
    notas_internas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    url_pago: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    pagado_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # ========== RELACIONES CORREGIDAS ==========
    # incidente: UN incidente tiene UNA factura (relación uno a uno)
    incidente: Mapped["Incidente"] = relationship(
        back_populates="factura",  # ← SINGULAR porque Incidente tiene "factura"
        uselist=False
    )
    
    taller: Mapped["Taller"] = relationship(back_populates="facturas")
    cliente: Mapped["Cliente"] = relationship(back_populates="facturas")
    
    conceptos: Mapped[List["ConceptoFactura"]] = relationship(
        back_populates="factura",
        cascade="all, delete-orphan"
    )
    
    pagos: Mapped[List["Pago"]] = relationship(
        back_populates="factura", 
        cascade="all, delete-orphan"
    )


class ConceptoFactura(Base):
    __tablename__ = "conceptos_factura"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    factura_id: Mapped[int] = mapped_column(
        ForeignKey("facturas.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    concepto: Mapped[str] = mapped_column(String(200), nullable=False)
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Float, nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, nullable=False)
    
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relaciones
    factura: Mapped["Factura"] = relationship(back_populates="conceptos")