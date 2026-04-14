from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.pago import Pago
from app.schemas.pago import PagoActualizar, PagoCrear


COMISION_PLATAFORMA_PORCENTAJE = 0.10  # 10%


def obtener_pagos_por_cliente(db: Session, cliente_id: int) -> list[Pago]:
    consulta: Select[tuple[Pago]] = select(Pago).where(Pago.cliente_id == cliente_id).order_by(Pago.id.desc())
    return list(db.scalars(consulta))


def obtener_pagos_por_incidente(db: Session, incidente_id: int) -> list[Pago]:
    consulta: Select[tuple[Pago]] = select(Pago).where(Pago.incidente_id == incidente_id).order_by(Pago.id.desc())
    return list(db.scalars(consulta))


def obtener_pago_por_id(db: Session, pago_id: int) -> Pago | None:
    return db.get(Pago, pago_id)


def crear_pago(db: Session, cliente_id: int, incidente_id: int, payload: PagoCrear) -> Pago:
    monto = payload.monto
    comision_plataforma = monto * COMISION_PLATAFORMA_PORCENTAJE
    monto_para_taller = monto - comision_plataforma

    pago = Pago(
        cliente_id=cliente_id,
        incidente_id=incidente_id,
        monto=monto,
        comision_plataforma=comision_plataforma,
        monto_para_taller=monto_para_taller,
        metodo_pago=payload.metodo_pago,
    )
    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago


def actualizar_pago(db: Session, pago: Pago, payload: PagoActualizar) -> Pago:
    data = payload.model_dump(exclude_unset=True)
    for campo, valor in data.items():
        setattr(pago, campo, valor)

    db.add(pago)
    db.commit()
    db.refresh(pago)
    return pago


def eliminar_pago(db: Session, pago: Pago) -> None:
    db.delete(pago)
    db.commit()
