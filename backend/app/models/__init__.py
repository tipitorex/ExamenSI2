from app.models.cliente import Cliente
from app.models.comision_taller import ComisionTaller
from app.models.evidencia import Evidencia
from app.models.historial_estado_incidente import HistorialEstadoIncidente
from app.models.incidente import Incidente
from app.models.notificacion import Notificacion
from app.models.pago import Pago
from app.models.asignacion_taller import AsignacionTaller
from app.models.taller import Taller
from app.models.taller_servicio import TallerServicio
from app.models.tecnico import Tecnico
from app.models.vehiculo import Vehiculo
from app.models.plan_suscripcion import PlanSuscripcion  # ← NUEVO
from app.models.pago_suscripcion import PagoSuscripcion  # ← NUEVO
from app.models.solicitud_incidente import SolicitudIncidente
from app.models.super_admin import SuperAdmin

__all__ = [
    "Cliente",
    "Vehiculo",
    "Incidente",
    "HistorialEstadoIncidente",
    "Evidencia",
    "AsignacionTaller",
    "Notificacion",
    "Pago",
    "ComisionTaller",
    "Taller",
    "TallerServicio",
    "Tecnico",
    "PlanSuscripcion",      # ← NUEVO
    "PagoSuscripcion",      # ← NUEVO
    "SolicitudIncidente",
    "SuperAdmin",
]