from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TallerServicio(Base):
    __tablename__ = "taller_servicios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    precio_base: Mapped[float | None] = mapped_column(Float, nullable=True)
    tiempo_estimado_minutos: Mapped[int | None] = mapped_column(Integer, nullable=True)

    taller: Mapped["Taller"] = relationship(back_populates="servicios")
