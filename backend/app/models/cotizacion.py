from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(
        ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    taller_id: Mapped[int] = mapped_column(
        ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True
    )
    monto_total: Mapped[float] = mapped_column(Float, nullable=False)
    tiempo_estimado_reparacion_minutos: Mapped[int] = mapped_column(Integer, nullable=False)
    detalles_servicio: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="pendiente", nullable=False, index=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    incidente: Mapped["Incidente"] = relationship(back_populates="cotizaciones")
    taller: Mapped["Taller"] = relationship(back_populates="cotizaciones")
