from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TipoEvidencia(str, Enum):
    IMAGEN = "imagen"
    AUDIO = "audio"


class Evidencia(Base):
    __tablename__ = "evidencias"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo: Mapped[TipoEvidencia] = mapped_column(SqlEnum(TipoEvidencia, name="tipo_evidencia"), nullable=False)
    url_archivo: Mapped[str] = mapped_column(String(500), nullable=False)
    transcripcion_texto: Mapped[str | None] = mapped_column(Text, nullable=True)
    analisis_ia: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_subida: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    incidente: Mapped["Incidente"] = relationship(back_populates="evidencias")
