from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.schemas.autenticacion import RespuestaToken, SolicitudInicioSesion
from app.schemas.cliente import ClienteRespuesta
from app.services.autenticacion_servicio import autenticar_cliente, crear_token_acceso

router = APIRouter()


@router.post("/iniciar-sesion")
def iniciar_sesion(payload: SolicitudInicioSesion, db: Session = Depends(get_db)) -> RespuestaToken:
    cliente = autenticar_cliente(db, payload.email, payload.contrasena)
    if cliente is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas",
        )

    token_acceso = crear_token_acceso(subject=str(cliente.id))
    return RespuestaToken(
        token_acceso=token_acceso,
        tipo_token="bearer",
        cliente=ClienteRespuesta.model_validate(cliente),
    )


@router.get("/perfil")
def obtener_perfil(cliente_actual: Cliente = Depends(obtener_cliente_actual)) -> ClienteRespuesta:
    return ClienteRespuesta.model_validate(cliente_actual)
