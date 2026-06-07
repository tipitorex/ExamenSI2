from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Taller(Base):
    __tablename__ = "talleres"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    latitud: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitud: Mapped[float | None] = mapped_column(Float, nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # NUEVOS CAMPOS PARA SAAS
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("planes_suscripcion.id"), nullable=True, index=True)
    suscripcion_activa_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    incidentes_mes_actual: Mapped[int] = mapped_column(Integer, default=0)
    ultimo_reset_incidentes: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relaciones existentes
    tecnicos: Mapped[list["Tecnico"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    servicios: Mapped[list["TallerServicio"]] = relationship(
        back_populates="taller",
        cascade="all, delete-orphan",
    )
    solicitudes_atendidas: Mapped[list["AsignacionTaller"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    historial_comisiones: Mapped[list["ComisionTaller"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    notificaciones: Mapped[list["Notificacion"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    facturas: Mapped[list["Factura"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    dispositivos: Mapped[list["Dispositivo"]] = relationship(back_populates="taller")
    
    # Nuevas relaciones
    plan: Mapped["PlanSuscripcion | None"] = relationship(back_populates="talleres")
    pagos_suscripcion: Mapped[list["PagoSuscripcion"]] = relationship(
        back_populates="taller", 
        cascade="all, delete-orphan"
    )
    solicitudes_recibidas: Mapped[list["SolicitudIncidente"]] = relationship(
        back_populates="taller",
        cascade="all, delete-orphan"
    )
    resenas: Mapped[list["Resena"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
    cotizaciones: Mapped[list["Cotizacion"]] = relationship(back_populates="taller", cascade="all, delete-orphan")
