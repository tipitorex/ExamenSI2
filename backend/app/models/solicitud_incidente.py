from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SolicitudIncidente(Base):
    __tablename__ = "solicitudes_incidente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    estado: Mapped[str] = mapped_column(String(20), default="pendiente", nullable=False, index=True)
    fecha_envio: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tiempo_respuesta_segundos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    motivo_rechazo: Mapped[str | None] = mapped_column(Text, nullable=True)
    distancia_km: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relaciones
    incidente: Mapped["Incidente"] = relationship(back_populates="solicitudes")
    taller: Mapped["Taller"] = relationship(back_populates="solicitudes_recibidas")