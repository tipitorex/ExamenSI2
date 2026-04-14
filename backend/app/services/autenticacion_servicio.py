from datetime import UTC, datetime, timedelta

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.cliente import Cliente
from app.models.taller import Taller

_bcrypt_rounds = 4 if settings.app_env == "dev" else 12
contexto_contrasena = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=_bcrypt_rounds)


def verificar_contrasena(contrasena_plana: str, contrasena_hash: str) -> bool:
    return contexto_contrasena.verify(contrasena_plana, contrasena_hash)


def obtener_hash_contrasena(contrasena: str) -> str:
    return contexto_contrasena.hash(contrasena)


def autenticar_cliente(db: Session, email: str, contrasena: str) -> Cliente | None:
    consulta = select(Cliente).where(Cliente.email == email)
    cliente = db.scalar(consulta)

    if cliente is None or not verificar_contrasena(contrasena, cliente.contrasena_hash):
        return None

    return cliente


def autenticar_taller(db: Session, email: str, contrasena: str) -> Taller | None:
    consulta = select(Taller).where(Taller.email == email)
    taller = db.scalar(consulta)

    if taller is None or not verificar_contrasena(contrasena, taller.contrasena_hash):
        return None

    return taller


def crear_token_acceso(subject: str, tipo: str = "cliente") -> str:
    duracion_expiracion = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expira_en = datetime.now(UTC) + duracion_expiracion
    payload = {"sub": subject, "tipo": tipo, "exp": expira_en}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)