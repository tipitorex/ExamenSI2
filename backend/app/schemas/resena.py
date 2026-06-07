from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ResenaCrear(BaseModel):
    incidente_id: int
    puntuacion_taller: int = Field(ge=1, le=5)
    puntuacion_tecnico: int | None = Field(default=None, ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=1000)


class ResenaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    incidente_id: int
    cliente_id: int
    taller_id: int
    tecnico_id: int | None
    puntuacion_taller: int
    puntuacion_tecnico: int | None
    comentario: str | None
    creado_en: datetime
    taller_nombre: str | None = None
    tecnico_nombre: str | None = None
    cliente_nombre: str | None = None


class RankingTallerItem(BaseModel):
    taller_id: int
    taller_nombre: str
    promedio_puntuacion: float
    total_resenas: int
    promedio_tecnico: float | None
