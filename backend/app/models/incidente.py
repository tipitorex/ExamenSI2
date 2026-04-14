from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Incidente(Base):
    __tablename__ = "incidentes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    vehiculo_id: Mapped[int] = mapped_column(ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=False, index=True)
    latitud: Mapped[float] = mapped_column(Float, nullable=False)
    longitud: Mapped[float] = mapped_column(Float, nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    resumen_ia: Mapped[str | None] = mapped_column(Text, nullable=True)
    prioridad: Mapped[str] = mapped_column(String(20), default="media", nullable=False)
    estado: Mapped[str] = mapped_column(String(30), default="pendiente", nullable=False)
    direccion_texto: Mapped[str | None] = mapped_column(String(255), nullable=True)

    fecha_asignacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_atencion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fecha_finalizacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    costo_total: Mapped[float | None] = mapped_column(Float, nullable=True)
    comision_plataforma: Mapped[float | None] = mapped_column(Float, nullable=True)

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    cliente: Mapped["Cliente"] = relationship(back_populates="incidentes")
    vehiculo: Mapped["Vehiculo"] = relationship(back_populates="incidentes")
    historial_estados: Mapped[list["HistorialEstadoIncidente"]] = relationship(
        back_populates="incidente",
        cascade="all, delete-orphan",
        order_by="HistorialEstadoIncidente.id",
    )
    evidencias: Mapped[list["Evidencia"]] = relationship(back_populates="incidente", cascade="all, delete-orphan")
    asignacion_taller: Mapped["AsignacionTaller | None"] = relationship(back_populates="incidente", uselist=False)
    pagos: Mapped[list["Pago"]] = relationship(back_populates="incidente", cascade="all, delete-orphan")
    comisiones_taller: Mapped[list["ComisionTaller"]] = relationship(back_populates="incidente", cascade="all, delete-orphan")
    notificaciones: Mapped[list["Notificacion"]] = relationship(back_populates="incidente", cascade="all, delete-orphan")