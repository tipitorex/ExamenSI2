from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.session import SessionLocal
from app.models.cliente import Cliente
from app.models.taller import Taller

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/autenticacion/iniciar-sesion")
oauth2_scheme_taller = OAuth2PasswordBearer(tokenUrl="/api/v1/talleres/iniciar-sesion")


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