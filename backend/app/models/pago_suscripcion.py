from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PagoSuscripcion(Base):
    __tablename__ = "pagos_suscripcion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    monto: Mapped[float] = mapped_column(Float, nullable=False)
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes_suscripcion.id"), nullable=True)
    periodo: Mapped[str | None] = mapped_column(String(20), nullable=True)  # mensual, anual
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="pendiente")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    fecha_vencimiento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    datos_extra: Mapped[dict] = mapped_column(JSON, default=dict)  # ← CAMBIADO de 'metadata' a 'datos_extra'

    # Relaciones
    taller: Mapped["Taller"] = relationship(back_populates="pagos_suscripcion")
    plan: Mapped["PlanSuscripcion"] = relationship(back_populates="pagos")