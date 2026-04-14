from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.cliente import ClienteCrear, ClienteRespuesta
from app.services.cliente_servicio import crear_cliente, obtener_cliente_por_email

router = APIRouter()


@router.post("")
def registrar_cliente(payload: ClienteCrear, db: Session = Depends(get_db)) -> ClienteRespuesta:
    cliente_existente = obtener_cliente_por_email(db, payload.email)
    if cliente_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya se encuentra registrado",
        )

    cliente = crear_cliente(db, payload)
    return ClienteRespuesta.model_validate(cliente)
