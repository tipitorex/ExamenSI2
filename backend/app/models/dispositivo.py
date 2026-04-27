from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Dispositivo(Base):
    __tablename__ = "dispositivos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), nullable=False)
    fcm_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plataforma: Mapped[str] = mapped_column(String(20), nullable=False)  # android, ios
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente: Mapped["Cliente"] = relationship(back_populates="dispositivos")