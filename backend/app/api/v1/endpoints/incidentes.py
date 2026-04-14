from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.schemas.incidente import (
    IncidenteActualizarEstado,
    IncidenteCrear,
    IncidenteDetalleRespuesta,
    IncidenteRespuesta,
)
from app.services.incidente_servicio import (
    actualizar_estado_incidente,
    crear_incidente,
    obtener_incidente_por_id,
    obtener_incidentes_por_cliente,
    obtener_vehiculo_de_cliente,
)

router = APIRouter()


@router.post("")
def reportar_incidente(
    payload: IncidenteCrear,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> IncidenteRespuesta:
    vehiculo = obtener_vehiculo_de_cliente(db, payload.vehiculo_id, cliente_actual.id)
    if vehiculo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehiculo no encontrado para este cliente")

    incidente = crear_incidente(db, cliente_actual.id, payload)
    return IncidenteRespuesta.model_validate(incidente)


@router.get("")
def listar_incidentes(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[IncidenteDetalleRespuesta]:
    incidentes = obtener_incidentes_por_cliente(db, cliente_actual.id)
    return [IncidenteDetalleRespuesta.model_validate(i) for i in incidentes]


@router.patch("/{incidente_id}")
def gestionar_incidente(
    incidente_id: int,
    payload: IncidenteActualizarEstado,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> IncidenteDetalleRespuesta:
    incidente = obtener_incidente_por_id(db, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")

    try:
        actualizado = actualizar_estado_incidente(db, incidente, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    incidente_detalle = obtener_incidente_por_id(db, actualizado.id)
    return IncidenteDetalleRespuesta.model_validate(incidente_detalle)
