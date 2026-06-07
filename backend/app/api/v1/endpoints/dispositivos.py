from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.api.deps import get_db, obtener_cliente_actual, obtener_taller_actual, obtener_tecnico_actual
from app.models.cliente import Cliente
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.models.dispositivo import Dispositivo

router = APIRouter()

# ============================================================
# SCHEMAS
# ============================================================

class DispositivoRegistro(BaseModel):
    fcm_token: str
    plataforma: str  # "android", "ios", "web"

class DispositivoWebRegistro(BaseModel):
    fcm_token: str
    taller_id: int

# ============================================================
# ENDPOINTS PARA CLIENTES (MÓVIL)
# ============================================================

@router.post("/registrar")
def registrar_dispositivo(
    payload: DispositivoRegistro,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Registra o actualiza el token FCM del dispositivo del cliente (móvil)"""
    
    # Validar plataforma
    if payload.plataforma not in ["android", "ios"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plataforma debe ser 'android' o 'ios'"
        )
    
    # Buscar si el token ya existe
    dispositivo = db.query(Dispositivo).filter(
        Dispositivo.fcm_token == payload.fcm_token
    ).first()
    
    if dispositivo:
        # Actualizar existente
        dispositivo.plataforma = payload.plataforma
        dispositivo.activo = True
        dispositivo.cliente_id = cliente_actual.id
    else:
        # Crear nuevo
        dispositivo = Dispositivo(
            cliente_id=cliente_actual.id,
            fcm_token=payload.fcm_token,
            plataforma=payload.plataforma,
            activo=True
        )
        db.add(dispositivo)
    
    db.commit()
    
    return {"message": "Dispositivo registrado correctamente", "token": payload.fcm_token}

# ============================================================
# ENDPOINTS PARA TALLERES (WEB)
# ============================================================

@router.post("/registrar-web")
def registrar_dispositivo_web(
    payload: DispositivoWebRegistro,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """Registra el token FCM del navegador web del taller"""
    
    # Verificar que el taller autenticado coincide
    if taller_actual.id != payload.taller_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado"
        )
    
    # Buscar si el token ya existe para este taller
    dispositivo = db.query(Dispositivo).filter(
        Dispositivo.fcm_token == payload.fcm_token,
        Dispositivo.taller_id == taller_actual.id
    ).first()
    
    if dispositivo:
        # Reactivar
        dispositivo.activo = True
        dispositivo.plataforma = "web"
    else:
        # Crear nuevo
        dispositivo = Dispositivo(
            taller_id=taller_actual.id,
            fcm_token=payload.fcm_token,
            plataforma="web",
            activo=True
        )
        db.add(dispositivo)
    
    db.commit()
    
    return {"message": "Token web registrado correctamente"}


@router.post("/registrar-tecnico")
def registrar_dispositivo_tecnico(
    payload: DispositivoRegistro,
    db: Session = Depends(get_db),
    tecnico_actual: Tecnico = Depends(obtener_tecnico_actual),
):
    """Registra o actualiza el token FCM del dispositivo del técnico (móvil)."""
    if payload.plataforma not in ["android", "ios"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plataforma debe ser 'android' o 'ios'",
        )

    dispositivo = db.query(Dispositivo).filter(
        Dispositivo.fcm_token == payload.fcm_token
    ).first()

    if dispositivo:
        dispositivo.plataforma = payload.plataforma
        dispositivo.activo = True
        dispositivo.tecnico_id = tecnico_actual.id
        dispositivo.cliente_id = None
        dispositivo.taller_id = None
    else:
        dispositivo = Dispositivo(
            tecnico_id=tecnico_actual.id,
            fcm_token=payload.fcm_token,
            plataforma=payload.plataforma,
            activo=True,
        )
        db.add(dispositivo)

    db.commit()
    return {"message": "Dispositivo de técnico registrado correctamente"}


@router.post("/eliminar-web")
def eliminar_dispositivo_web(
    payload: DispositivoWebRegistro,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """Elimina (desactiva) el token FCM del navegador web del taller"""
    
    dispositivo = db.query(Dispositivo).filter(
        Dispositivo.fcm_token == payload.fcm_token,
        Dispositivo.taller_id == taller_actual.id
    ).first()
    
    if dispositivo:
        dispositivo.activo = False
        db.commit()
    
    return {"message": "Token web eliminado correctamente"}