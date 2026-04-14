from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.models.incidente import Incidente
from app.schemas.evidencia import EvidenciaActualizar, EvidenciaCrear, EvidenciaRespuesta
from app.services.evidencia_servicio import (
    actualizar_evidencia,
    crear_evidencia,
    eliminar_evidencia,
    obtener_evidencia_por_id,
    obtener_evidencias_por_incidente,
)

router = APIRouter()


@router.post("/{incidente_id}")
def crear_evidencia_incidente(
    incidente_id: int,
    payload: EvidenciaCrear,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> EvidenciaRespuesta:
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    evidencia = crear_evidencia(db, incidente_id, payload)
    return EvidenciaRespuesta.model_validate(evidencia)


@router.get("/{incidente_id}")
def listar_evidencias_incidente(
    incidente_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> list[EvidenciaRespuesta]:
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    evidencias = obtener_evidencias_por_incidente(db, incidente_id)
    return [EvidenciaRespuesta.model_validate(e) for e in evidencias]


@router.get("/{incidente_id}/{evidencia_id}")
def obtener_evidencia(
    incidente_id: int,
    evidencia_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> EvidenciaRespuesta:
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    evidencia = obtener_evidencia_por_id(db, evidencia_id)
    if evidencia is None or evidencia.incidente_id != incidente_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidencia no encontrada",
        )

    return EvidenciaRespuesta.model_validate(evidencia)


@router.put("/{incidente_id}/{evidencia_id}")
def actualizar_evidencia_incidente(
    incidente_id: int,
    evidencia_id: int,
    payload: EvidenciaActualizar,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> EvidenciaRespuesta:
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    evidencia = obtener_evidencia_por_id(db, evidencia_id)
    if evidencia is None or evidencia.incidente_id != incidente_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidencia no encontrada",
        )

    evidencia_actualizada = actualizar_evidencia(db, evidencia, payload)
    return EvidenciaRespuesta.model_validate(evidencia_actualizada)


@router.delete("/{incidente_id}/{evidencia_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_evidencia_incidente(
    incidente_id: int,
    evidencia_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
) -> Response:
    incidente = db.get(Incidente, incidente_id)
    if incidente is None or incidente.cliente_id != cliente_actual.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado",
        )

    evidencia = obtener_evidencia_por_id(db, evidencia_id)
    if evidencia is None or evidencia.incidente_id != incidente_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidencia no encontrada",
        )

    eliminar_evidencia(db, evidencia)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
