from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Vehiculo(Base):
    __tablename__ = "vehiculos"
    __table_args__ = (
        UniqueConstraint("cliente_id", "placa", name="uq_vehiculo_cliente_placa"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True)
    placa: Mapped[str] = mapped_column(String(20), nullable=False)
    marca: Mapped[str] = mapped_column(String(80), nullable=False)
    modelo: Mapped[str] = mapped_column(String(80), nullable=False)
    anio: Mapped[int | None] = mapped_column(nullable=True)
    color: Mapped[str | None] = mapped_column(String(40), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    cliente: Mapped["Cliente"] = relationship(back_populates="vehiculos")
    incidentes: Mapped[list["Incidente"]] = relationship(back_populates="vehiculo")