from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EstadoPago(str, Enum):
    PENDIENTE = "pendiente"
    COMPLETADO = "completado"
    FALLIDO = "fallido"
    REEMBOLSADO = "reembolsado"


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # NUEVO CAMPO
    factura_id: Mapped[int | None] = mapped_column(ForeignKey("facturas.id", ondelete="SET NULL"), nullable=True, index=True)

    monto: Mapped[float] = mapped_column(Float, nullable=False)
    comision_plataforma: Mapped[float] = mapped_column(Float, nullable=False)  # 10% del monto
    monto_para_taller: Mapped[float] = mapped_column(Float, nullable=False)   # 90% del monto

    estado: Mapped[EstadoPago] = mapped_column(SqlEnum(EstadoPago, name="estado_pago"), default=EstadoPago.PENDIENTE, nullable=False)
    metodo_pago: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referencia_pago: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # NUEVOS CAMPOS para Stripe
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    fecha_pago: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relaciones
    cliente: Mapped["Cliente"] = relationship(back_populates="pagos")
    incidente: Mapped["Incidente"] = relationship(back_populates="pagos")
    factura: Mapped["Factura | None"] = relationship(back_populates="pagos")  # NUEVA RELACIÓN