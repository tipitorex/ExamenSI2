from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TipoNotificacion(str, Enum):
    NUEVA_SOLICITUD = "nueva_solicitud"
    ASIGNACION_TALLER = "asignacion_taller"
    ACTUALIZACION_ESTADO = "actualizacion_estado"
    TALLER_ACEPTO = "taller_acepto"
    TALLER_RECHAZO = "taller_rechazo"
    TECNICO_EN_CAMINO = "tecnico_en_camino"


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), nullable=True, index=True)
    taller_id: Mapped[int | None] = mapped_column(ForeignKey("talleres.id", ondelete="CASCADE"), nullable=True, index=True)
    incidente_id: Mapped[int | None] = mapped_column(ForeignKey("incidentes.id", ondelete="CASCADE"), nullable=True, index=True)

    tipo: Mapped[TipoNotificacion] = mapped_column(SqlEnum(TipoNotificacion, name="tipo_notificacion"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(255), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    leido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_envio: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    datos_extra_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    cliente: Mapped["Cliente | None"] = relationship(back_populates="notificaciones")
    taller: Mapped["Taller | None"] = relationship(back_populates="notificaciones")
    incidente: Mapped["Incidente | None"] = relationship(back_populates="notificaciones")
