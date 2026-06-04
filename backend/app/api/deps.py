from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import SessionLocal
from app.models.cliente import Cliente
from app.models.taller import Taller
from app.models.tecnico import Tecnico

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/autenticacion/iniciar-sesion")
oauth2_scheme_taller = OAuth2PasswordBearer(tokenUrl="/api/v1/talleres/iniciar-sesion")
oauth2_scheme_tecnico = OAuth2PasswordBearer(tokenUrl="/api/v1/tecnicos/iniciar-sesion", auto_error=False)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def obtener_cliente_actual(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Cliente:
    excepcion_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        tipo = payload.get("tipo", "cliente")
        if subject is None:
            raise excepcion_credenciales
        if tipo != "cliente":
            raise excepcion_credenciales
        cliente_id = int(subject)
    except (JWTError, ValueError):
        raise excepcion_credenciales from None

    cliente = db.get(Cliente, cliente_id)
    if cliente is None:
        raise excepcion_credenciales

    return cliente


def obtener_taller_actual(token: str = Depends(oauth2_scheme_taller), db: Session = Depends(get_db)) -> Taller:
    excepcion_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token de taller",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        tipo = payload.get("tipo")
        if subject is None or tipo != "taller":
            raise excepcion_credenciales
        taller_id = int(subject)
    except (JWTError, ValueError):
        raise excepcion_credenciales from None

    taller = db.get(Taller, taller_id)
    if taller is None:
        raise excepcion_credenciales

    return taller


# ============================================================
# OBTENER TÉCNICO ACTUAL
# ============================================================

def obtener_tecnico_actual(token: str = Depends(oauth2_scheme_tecnico), db: Session = Depends(get_db)) -> Tecnico:
    """
    Obtiene el técnico autenticado a partir del token JWT.
    """
    excepcion_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token del técnico",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise excepcion_credenciales

    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        tipo = payload.get("tipo")
        
        if subject is None or tipo != "tecnico":
            raise excepcion_credenciales
            
        tecnico_id = int(subject)
    except (JWTError, ValueError):
        raise excepcion_credenciales from None

    tecnico = db.get(Tecnico, tecnico_id)
    if tecnico is None or not tecnico.activo:
        raise excepcion_credenciales

    return tecnico