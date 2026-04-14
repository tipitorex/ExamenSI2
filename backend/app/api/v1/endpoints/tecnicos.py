from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.schemas.tecnico import (
    TecnicoActualizar,
    TecnicoCrear,
    TecnicoDisponibilidadActualizar,
    TecnicoRespuesta,
)
from app.services.tecnico_servicio import (
    actualizar_disponibilidad_tecnico,
    actualizar_tecnico,
    crear_tecnico,
    eliminar_tecnico,
    listar_tecnicos_por_taller,
    obtener_tecnico_por_id,
)

router = APIRouter()


@router.post("")
def crear_tecnico_taller(
    payload: TecnicoCrear,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TecnicoRespuesta:
    tecnico = crear_tecnico(db, taller_actual.id, payload)
    return TecnicoRespuesta.model_validate(tecnico)


@router.get("")
def listar_tecnicos(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> list[TecnicoRespuesta]:
    tecnicos = listar_tecnicos_por_taller(db, taller_actual.id)
    return [TecnicoRespuesta.model_validate(t) for t in tecnicos]


@router.put("/{tecnico_id}")
def editar_tecnico(
    tecnico_id: int,
    payload: TecnicoActualizar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TecnicoRespuesta:
    tecnico = obtener_tecnico_por_id(db, tecnico_id)
    if tecnico is None or tecnico.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tecnico no encontrado")

    tecnico_actualizado = actualizar_tecnico(db, tecnico, payload)
    return TecnicoRespuesta.model_validate(tecnico_actualizado)


@router.patch("/{tecnico_id}/disponibilidad")
def cambiar_disponibilidad_tecnico(
    tecnico_id: int,
    payload: TecnicoDisponibilidadActualizar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TecnicoRespuesta:
    tecnico = obtener_tecnico_por_id(db, tecnico_id)
    if tecnico is None or tecnico.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tecnico no encontrado")

    tecnico_actualizado = actualizar_disponibilidad_tecnico(db, tecnico, payload.disponible)
    return TecnicoRespuesta.model_validate(tecnico_actualizado)


@router.delete("/{tecnico_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_tecnico(
    tecnico_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Response:
    tecnico = obtener_tecnico_por_id(db, tecnico_id)
    if tecnico is None or tecnico.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tecnico no encontrado")

    eliminar_tecnico(db, tecnico)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
