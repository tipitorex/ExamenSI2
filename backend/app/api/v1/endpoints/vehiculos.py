from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.schemas.vehiculo import VehiculoActualizar, VehiculoCrear, VehiculoRespuesta
from app.services.vehiculo_servicio import (
    actualizar_vehiculo,
    crear_vehiculo,
    eliminar_vehiculo,
    obtener_vehiculo_por_id,
    obtener_vehiculo_por_placa,
    obtener_vehiculos_por_cliente,
)

router = APIRouter()


@router.post("")
def crear_vehiculo_cliente(
    payload: VehiculoCrear,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> VehiculoRespuesta:
    existente = obtener_vehiculo_por_placa(db, cliente_actual.id, payload.placa)
    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La placa ya existe para este cliente",
        )

    vehiculo = crear_vehiculo(db, cliente_actual.id, payload)
    return VehiculoRespuesta.model_validate(vehiculo)


@router.get("")
def listar_vehiculos(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[VehiculoRespuesta]:
    vehiculos = obtener_vehiculos_por_cliente(db, cliente_actual.id)
    return [VehiculoRespuesta.model_validate(v) for v in vehiculos]


@router.put("/{vehiculo_id}")
def editar_vehiculo(
    vehiculo_id: int,
    payload: VehiculoActualizar,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> VehiculoRespuesta:
    vehiculo = obtener_vehiculo_por_id(db, vehiculo_id)
    if vehiculo is None or vehiculo.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehiculo no encontrado")

    vehiculo_actualizado = actualizar_vehiculo(db, vehiculo, payload)
    return VehiculoRespuesta.model_validate(vehiculo_actualizado)


@router.delete("/{vehiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> Response:
    vehiculo = obtener_vehiculo_por_id(db, vehiculo_id)
    if vehiculo is None or vehiculo.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehiculo no encontrado")

    eliminar_vehiculo(db, vehiculo)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
