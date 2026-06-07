from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from sqlalchemy import inspect, text

from app.api.v1.router import api_router
from app.core.settings import settings
from app.db.base import Base
from app.db.session import engine
from app.models import Cliente, HistorialEstadoIncidente, Incidente, Taller, TallerServicio, Tecnico, Vehiculo  # noqa: F401

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API base para atencion de emergencias vehiculares",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def ensure_sync_id_column(engine) -> None:
    inspector = inspect(engine)
    columnas = {col["name"] for col in inspector.get_columns("incidentes")}
    if "sync_id" not in columnas:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE incidentes ADD COLUMN sync_id VARCHAR(36);"))
            conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ux_incidentes_sync_id ON incidentes(sync_id);"
            ))


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_sync_id_column(engine)

# Servir archivos estáticos (imágenes, audios)
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(api_router, prefix="/api/v1")