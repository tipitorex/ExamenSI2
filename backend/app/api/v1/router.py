from fastapi import APIRouter

from app.api.v1.endpoints import (
    asignaciones_taller,
    autenticacion,
    clientes,
    evidencias,
    incidentes,
    notificaciones,
    pagos,
    salud,
    talleres,
    tecnicos,
    vehiculos,
    dispositivos,
    reportes,
    mapas
)

api_router = APIRouter()

api_router.include_router(salud.router, tags=["salud"])
api_router.include_router(autenticacion.router, prefix="/autenticacion", tags=["autenticacion"])
api_router.include_router(clientes.router, prefix="/clientes", tags=["clientes"])
api_router.include_router(talleres.router, prefix="/talleres", tags=["talleres"])
api_router.include_router(vehiculos.router, prefix="/vehiculos", tags=["vehiculos"])
api_router.include_router(tecnicos.router, prefix="/tecnicos", tags=["tecnicos"])
api_router.include_router(incidentes.router, prefix="/incidentes", tags=["incidentes"])
api_router.include_router(evidencias.router, prefix="/evidencias", tags=["evidencias"])
api_router.include_router(asignaciones_taller.router, prefix="/asignaciones", tags=["asignaciones"])
api_router.include_router(notificaciones.router, prefix="/notificaciones", tags=["notificaciones"])
api_router.include_router(pagos.router, prefix="/pagos", tags=["pagos"])
api_router.include_router(dispositivos.router, prefix="/dispositivos", tags=["dispositivos"])
api_router.include_router(reportes.router, prefix="/reportes", tags=["reportes"])
api_router.include_router(mapas.router, prefix="/mapas", tags=["mapas"])