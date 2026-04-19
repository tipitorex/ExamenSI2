from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.taller import Taller
from app.models.taller_servicio import TallerServicio
from app.schemas.taller import TallerCrear
from app.services.autenticacion_servicio import obtener_hash_contrasena


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

    taller = Taller(
        nombre=payload.nombre,
        email=str(payload.email),
        telefono=payload.telefono,
        direccion=payload.direccion,
        latitud=payload.latitud,           # NUEVO
        longitud=payload.longitud,         # NUEVO
        contrasena_hash=obtener_hash_contrasena(payload.contrasena),
        activo=True,
        servicios=[TallerServicio(nombre=servicio) for servicio in servicios_unicos],
    )
    db.add(taller)
    db.commit()
    db.refresh(taller)
    return taller