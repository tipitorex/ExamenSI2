from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.models.incidente import Incidente
from app.schemas.pago import PagoActualizar, PagoCrear, PagoRespuesta
from app.services.pago_servicio import (
    actualizar_pago,
    crear_pago,
    eliminar_pago,
    obtener_pago_por_id,
    obtener_pagos_por_cliente,
    obtener_pagos_por_incidente,
)

router = APIRouter()


@router.post("/{incidente_id}")
def crear_pago_incidente(
    incidente_id: int,
    payload: PagoCrear,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> PagoRespuesta:
    """Crear un pago para un incidente específico"""
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    pago = crear_pago(db, cliente_actual.id, incidente_id, payload)
    return PagoRespuesta.model_validate(pago)


@router.get("/cliente")
def listar_pagos_cliente(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[PagoRespuesta]:
    """Obtener todos los pagos del cliente actual"""
    pagos = obtener_pagos_por_cliente(db, cliente_actual.id)
    return [PagoRespuesta.model_validate(p) for p in pagos]


@router.get("/{incidente_id}")
def listar_pagos_incidente(
    incidente_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[PagoRespuesta]:
    """Obtener todos los pagos de un incidente específico"""
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    pagos = obtener_pagos_por_incidente(db, incidente_id)
    return [PagoRespuesta.model_validate(p) for p in pagos]


@router.get("/{incidente_id}/{pago_id}")
def obtener_pago(
    incidente_id: int,
    pago_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> PagoRespuesta:
    """Obtener los detalles de un pago específico"""
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    pago = obtener_pago_por_id(db, pago_id)
    if pago is None or pago.incidente_id != incidente_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado",
        )

    return PagoRespuesta.model_validate(pago)


@router.put("/{incidente_id}/{pago_id}")
def actualizar_pago_handler(
    incidente_id: int,
    pago_id: int,
    payload: PagoActualizar,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> PagoRespuesta:
    """Actualizar los detalles de un pago"""
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    pago = obtener_pago_por_id(db, pago_id)
    if pago is None or pago.incidente_id != incidente_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado",
        )

    pago_actualizado = actualizar_pago(db, pago, payload)
    return PagoRespuesta.model_validate(pago_actualizado)


@router.delete("/{incidente_id}/{pago_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_pago_handler(
    incidente_id: int,
    pago_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> Response:
    """Eliminar un pago"""
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    pago = obtener_pago_por_id(db, pago_id)
    if pago is None or pago.incidente_id != incidente_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado",
        )

    eliminar_pago(db, pago)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
