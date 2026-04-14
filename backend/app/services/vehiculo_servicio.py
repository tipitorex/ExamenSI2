from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.vehiculo import Vehiculo
from app.schemas.vehiculo import VehiculoActualizar, VehiculoCrear


def obtener_vehiculos_por_cliente(db: Session, cliente_id: int) -> list[Vehiculo]:
    consulta: Select[tuple[Vehiculo]] = select(Vehiculo).where(Vehiculo.cliente_id == cliente_id).order_by(Vehiculo.id.desc())
    return list(db.scalars(consulta))


def obtener_vehiculo_por_id(db: Session, vehiculo_id: int) -> Vehiculo | None:
    return db.get(Vehiculo, vehiculo_id)


def obtener_vehiculo_por_placa(db: Session, cliente_id: int, placa: str) -> Vehiculo | None:
    consulta: Select[tuple[Vehiculo]] = select(Vehiculo).where(
        Vehiculo.cliente_id == cliente_id,
        Vehiculo.placa == placa.upper(),
    )
    return db.scalar(consulta)


def crear_vehiculo(db: Session, cliente_id: int, payload: VehiculoCrear) -> Vehiculo:
    vehiculo = Vehiculo(
        cliente_id=cliente_id,
        placa=payload.placa.upper(),
        marca=payload.marca,
        modelo=payload.modelo,
        anio=payload.anio,
        color=payload.color,
    )
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo


def actualizar_vehiculo(db: Session, vehiculo: Vehiculo, payload: VehiculoActualizar) -> Vehiculo:
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(vehiculo, campo, valor)

    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    return vehiculo


def eliminar_vehiculo(db: Session, vehiculo: Vehiculo) -> None:
    db.delete(vehiculo)
    db.commit()