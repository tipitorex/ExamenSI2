from sqlalchemy import Select, select
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.taller import Taller
from app.models.taller_servicio import TallerServicio
from app.models.plan_suscripcion import PlanSuscripcion
from app.schemas.taller import TallerCrear
from app.services.autenticacion_servicio import obtener_hash_contrasena


def obtener_plan_gratuito(db: Session) -> PlanSuscripcion | None:
    """Obtiene el plan gratuito de la base de datos"""
    consulta = select(PlanSuscripcion).where(PlanSuscripcion.nombre == "gratuito")
    return db.scalar(consulta)


def obtener_taller_por_email(db: Session, email: str) -> Taller | None:
    consulta: Select[tuple[Taller]] = select(Taller).where(Taller.email == email)
    return db.scalar(consulta)


def crear_taller(db: Session, payload: TallerCrear) -> Taller:
    servicios_unicos: list[str] = []
    for servicio in payload.servicios:
        normalizado = servicio.strip()
        if not normalizado:
            continue
        if normalizado.lower() in {item.lower() for item in servicios_unicos}:
            continue
        servicios_unicos.append(normalizado)

    # Obtener el plan gratuito por defecto
    plan_gratuito = obtener_plan_gratuito(db)
    
    taller = Taller(
        nombre=payload.nombre,
        email=str(payload.email),
        telefono=payload.telefono,
        direccion=payload.direccion,
        latitud=payload.latitud,
        longitud=payload.longitud,
        contrasena_hash=obtener_hash_contrasena(payload.contrasena),
        activo=True,
        plan_id=plan_gratuito.id if plan_gratuito else None,
        suscripcion_activa_hasta=datetime.now() + timedelta(days=30),  # 30 días de prueba
        servicios=[TallerServicio(nombre=servicio) for servicio in servicios_unicos],
    )
    db.add(taller)
    db.commit()
    db.refresh(taller)
    return taller