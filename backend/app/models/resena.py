from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Resena(Base):
    __tablename__ = "resenas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incidente_id: Mapped[int] = mapped_column(
        ForeignKey("incidentes.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    taller_id: Mapped[int] = mapped_column(
        ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tecnico_id: Mapped[int | None] = mapped_column(
        ForeignKey("tecnicos.id", ondelete="SET NULL"), nullable=True, index=True
    )
    puntuacion_taller: Mapped[int] = mapped_column(Integer, nullable=False)
    puntuacion_tecnico: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comentario: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones
    incidente: Mapped["Incidente"] = relationship(back_populates="resena")
    cliente: Mapped["Cliente"] = relationship(back_populates="resenas")
    taller: Mapped["Taller"] = relationship(back_populates="resenas")
    tecnico: Mapped["Tecnico | None"] = relationship(back_populates="resenas")
