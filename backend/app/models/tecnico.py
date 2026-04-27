from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Tecnico(Base):
    __tablename__ = "tecnicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    especialidad: Mapped[str | None] = mapped_column(String(120), nullable=True)
    disponible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    latitud_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitud_actual: Mapped[float | None] = mapped_column(Float, nullable=True)
    ultima_actualizacion_ubicacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    taller: Mapped["Taller"] = relationship(back_populates="tecnicos")
    asignaciones: Mapped[list["AsignacionTaller"]] = relationship(back_populates="tecnico")