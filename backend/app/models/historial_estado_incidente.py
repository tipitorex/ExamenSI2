from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HistorialEstadoIncidente(Base):
    __tablename__ = "historial_estados_incidente"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True)
    estado_anterior: Mapped[str | None] = mapped_column(String(30), nullable=True)
    estado_nuevo: Mapped[str] = mapped_column(String(30), nullable=False)
    observacion: Mapped[str | None] = mapped_column(Text, nullable=True)
    usuario_que_cambio: Mapped[str | None] = mapped_column(String(100), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    incidente: Mapped["Incidente"] = relationship(back_populates="historial_estados")

    @property
    def fecha_cambio(self) -> datetime:
        # Alias de lectura con semantica de negocio.
        return self.creado_en