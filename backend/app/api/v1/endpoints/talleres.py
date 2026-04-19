from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.schemas.taller import TallerCrear, TallerInicioSesion, TallerRespuesta, TallerTokenRespuesta
from app.services.autenticacion_servicio import autenticar_taller, crear_token_acceso
from app.services.taller_servicio import crear_taller, obtener_taller_por_email

router = APIRouter()


def serializar_taller(taller: Taller) -> TallerRespuesta:
    return TallerRespuesta(
        id=taller.id,
        nombre=taller.nombre,
        email=taller.email,
        telefono=taller.telefono,
        direccion=taller.direccion,
        latitud=taller.latitud,        # NUEVO
        longitud=taller.longitud,      # NUEVO
        servicios=[servicio.nombre for servicio in taller.servicios],
        activo=taller.activo,
        creado_en=taller.creado_en,
    )


@router.post("")
def registrar_taller(payload: TallerCrear, db: Session = Depends(get_db)) -> TallerRespuesta:
    taller_existente = obtener_taller_por_email(db, payload.email)
    if taller_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo del taller ya se encuentra registrado",
        )

    taller = crear_taller(db, payload)
    return serializar_taller(taller)


@router.post("/iniciar-sesion")
def iniciar_sesion_taller(payload: TallerInicioSesion, db: Session = Depends(get_db)) -> TallerTokenRespuesta:
    taller = autenticar_taller(db, payload.email, payload.contrasena)
    if taller is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    token_acceso = crear_token_acceso(subject=str(taller.id), tipo="taller")
    return TallerTokenRespuesta(
        token_acceso=token_acceso,
        tipo_token="bearer",
        taller=serializar_taller(taller),
    )


@router.get("/perfil")
def obtener_perfil_taller(taller_actual: Taller = Depends(obtener_taller_actual)) -> TallerRespuesta:
    return serializar_taller(taller_actual)