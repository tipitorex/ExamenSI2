from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CotizacionVehiculo(Base):
    __tablename__ = "cotizaciones_vehiculo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)

    # Solicitud del cliente
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    estado: Mapped[str] = mapped_column(String(30), default="pendiente", nullable=False)

    # Respuesta del taller (items en JSON)
    respuesta_items_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuesta_monto: Mapped[float | None] = mapped_column(Float, nullable=True)
    respuesta_descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    respuesta_tiempo_horas: Mapped[float | None] = mapped_column(Float, nullable=True)

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    respondido_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    cliente: Mapped["Cliente"] = relationship("Cliente")
    taller: Mapped["Taller"] = relationship("Taller")
