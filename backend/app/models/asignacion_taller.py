from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AsignacionTaller(Base):
    __tablename__ = "asignaciones_taller"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(
        ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    tecnico_id: Mapped[int | None] = mapped_column(ForeignKey("tecnicos.id", ondelete="SET NULL"), nullable=True, index=True)

    tiempo_estimado_llegada_minutos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    distancia_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    fecha_asignacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    es_aceptado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    motivo_rechazo: Mapped[str | None] = mapped_column(Text, nullable=True)

    incidente: Mapped["Incidente"] = relationship(back_populates="asignacion_taller")
    taller: Mapped["Taller"] = relationship(back_populates="solicitudes_atendidas")
    tecnico: Mapped["Tecnico | None"] = relationship(back_populates="asignaciones")
