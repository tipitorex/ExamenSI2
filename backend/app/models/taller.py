from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Taller(Base):
    __tablename__ = "talleres"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tecnicos: Mapped[list["Tecnico"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    servicios: Mapped[list["TallerServicio"]] = relationship(
        back_populates="taller",
        cascade="all, delete-orphan",
    )
    solicitudes_atendidas: Mapped[list["AsignacionTaller"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    historial_comisiones: Mapped[list["ComisionTaller"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    notificaciones: Mapped[list["Notificacion"]] = relationship(back_populates="taller", cascade="all, delete-orphan")