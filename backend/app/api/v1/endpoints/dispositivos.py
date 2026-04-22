from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, obtener_cliente_actual
from app.models.cliente import Cliente
from app.models.dispositivo import Dispositivo

router = APIRouter()

class DispositivoRegistro(BaseModel):
    fcm_token: str
    plataforma: str  # "android" o "ios"

@router.post("/registrar")
def registrar_dispositivo(
    payload: DispositivoRegistro,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Registra o actualiza el token FCM del dispositivo del cliente"""
    
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
        )
        db.add(dispositivo)
    
    db.commit()
    
    return {"message": "Dispositivo registrado correctamente", "token": payload.fcm_token}