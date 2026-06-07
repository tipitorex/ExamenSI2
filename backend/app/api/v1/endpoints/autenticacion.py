from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.models.taller import Taller
from app.models.super_admin import SuperAdmin
from app.schemas.autenticacion import RespuestaToken, SolicitudInicioSesion
from app.schemas.cliente import ClienteRespuesta
from app.services.autenticacion_servicio import autenticar_cliente, crear_token_acceso, verificar_contrasena

router = APIRouter()


@router.post("/iniciar-sesion")
def iniciar_sesion(payload: SolicitudInicioSesion, db: Session = Depends(get_db)):
    
    # 1. Verificar si es Super Admin
    super_admin = db.query(SuperAdmin).filter(SuperAdmin.email == payload.email).first()
    if super_admin and verificar_contrasena(payload.contrasena, super_admin.contrasena_hash):
        token_acceso = crear_token_acceso(subject=str(super_admin.id), tipo="super_admin")
        return {
            "token_acceso": token_acceso,
            "tipo_token": "bearer",
            "rol": "super_admin",
            "usuario_id": super_admin.id,
            "redirigir_a": "/super-admin/dashboard"
        }
    
    # 2. Verificar si es Taller
    taller = db.query(Taller).filter(Taller.email == payload.email).first()
    if taller and verificar_contrasena(payload.contrasena, taller.contrasena_hash):
        token_acceso = crear_token_acceso(subject=str(taller.id), tipo="taller")
        return {
            "token_acceso": token_acceso,
            "tipo_token": "bearer",
            "rol": "taller",
            "usuario_id": taller.id,
            "redirigir_a": "/dashboard",
            "taller": {
                "id": taller.id,
                "nombre": taller.nombre,
                "email": taller.email,
                "telefono": taller.telefono
            }
        }
    
    # 3. Verificar si es Cliente (app móvil)
    cliente = autenticar_cliente(db, payload.email, payload.contrasena)
    if cliente:
        token_acceso = crear_token_acceso(subject=str(cliente.id), tipo="cliente")
        return {
            "token_acceso": token_acceso,
            "tipo_token": "bearer",
            "rol": "cliente",
            "usuario_id": cliente.id,
            "redirigir_a": "/cliente/dashboard",
            "cliente": ClienteRespuesta.model_validate(cliente).model_dump()
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )


@router.get("/perfil")
def obtener_perfil(cliente_actual: Cliente = Depends(obtener_cliente_actual)) -> ClienteRespuesta:
    return ClienteRespuesta.model_validate(cliente_actual)