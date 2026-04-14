from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TallerServicio(Base):
    __tablename__ = "taller_servicios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    taller_id: Mapped[int] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)

    taller: Mapped["Taller"] = relationship(back_populates="servicios")
