from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


app.include_router(api_router, prefix="/api/v1")
