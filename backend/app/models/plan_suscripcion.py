from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlanSuscripcion(Base):
    __tablename__ = "planes_suscripcion"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    precio_mensual: Mapped[float] = mapped_column(Float, default=0)
    precio_anual: Mapped[float] = mapped_column(Float, default=0)
    limite_tecnicos: Mapped[int] = mapped_column(Integer, default=2)
    limite_incidentes_mensual: Mapped[int] = mapped_column(Integer, default=10)
    caracteristicas: Mapped[dict] = mapped_column(JSON, default=dict)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    talleres: Mapped[list["Taller"]] = relationship(back_populates="plan")
    pagos: Mapped[list["PagoSuscripcion"]] = relationship(back_populates="plan")