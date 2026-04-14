from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ComisionTaller(Base):
    __tablename__ = "comisiones_taller"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True)

    monto_incidente_total: Mapped[float] = mapped_column(Float, nullable=False)
    comision_aplicada: Mapped[float] = mapped_column(Float, nullable=False)
    monto_neto_taller: Mapped[float] = mapped_column(Float, nullable=False)

    fecha_comision: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    pagado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_pago: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    taller: Mapped["Taller"] = relationship(back_populates="historial_comisiones")
    incidente: Mapped["Incidente"] = relationship(back_populates="comisiones_taller")
