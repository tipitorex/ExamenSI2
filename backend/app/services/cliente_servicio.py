from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.schemas.cliente import ClienteCrear
from app.services.autenticacion_servicio import obtener_hash_contrasena


def obtener_cliente_por_email(db: Session, email: str) -> Cliente | None:
    consulta = select(Cliente).where(Cliente.email == email)
    return db.scalar(consulta)


def crear_cliente(db: Session, payload: ClienteCrear) -> Cliente:
    cliente = Cliente(
        nombre_completo=payload.nombre_completo,
        email=str(payload.email),
        telefono=payload.telefono,
        contrasena_hash=obtener_hash_contrasena(payload.contrasena),
        rol="cliente",
        activo=True,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente