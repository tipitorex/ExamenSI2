from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(30), default="cliente", nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    vehiculos: Mapped[list["Vehiculo"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
    incidentes: Mapped[list["Incidente"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
    pagos: Mapped[list["Pago"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
    notificaciones: Mapped[list["Notificacion"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
    dispositivos: Mapped[list["Dispositivo"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")