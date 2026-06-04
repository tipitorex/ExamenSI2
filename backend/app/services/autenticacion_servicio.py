from datetime import UTC, datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.cliente import Cliente
from app.models.taller import Taller
from app.models.tecnico import Tecnico

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


def autenticar_tecnico(db: Session, email: str, contrasena: str) -> Tecnico | None:
    consulta = select(Tecnico).where(Tecnico.email == email)
    tecnico = db.scalar(consulta)

    if tecnico is None or not verificar_contrasena(contrasena, tecnico.contrasena_hash):
        return None

    return tecnico


def crear_token_acceso(subject: str, tipo: str = "cliente") -> str:
    duracion_expiracion = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expira_en = datetime.now(UTC) + duracion_expiracion
    payload = {"sub": subject, "tipo": tipo, "exp": expira_en}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verificar_token_websocket(token: str, db: Session) -> dict | None:
    """
    Verifica token JWT para conexiones WebSocket.
    Retorna el payload decodificado o None si es inválido.
    Soporta tokens de cliente, taller y técnico.
    
    Args:
        token: Token JWT recibido por query string
        db: Sesión de base de datos
    
    Returns:
        dict con payload del token (contiene 'sub' y 'tipo') o None si es inválido
    """
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        subject = payload.get("sub")
        tipo = payload.get("tipo")
        
        # Validar que tenga subject y tipo válido (ahora incluye "tecnico")
        if subject is None or tipo not in ["cliente", "taller", "tecnico"]:
            return None
        
        # Verificar que el usuario existe y está activo en la base de datos
        if tipo == "cliente":
            cliente = db.get(Cliente, int(subject))
            if not cliente or not cliente.activo:
                return None
        elif tipo == "taller":
            taller = db.get(Taller, int(subject))
            if not taller or not taller.activo:
                return None
        elif tipo == "tecnico":
            tecnico = db.get(Tecnico, int(subject))
            if not tecnico or not tecnico.activo:
                return None
        
        return payload
    except JWTError:
        return None
    except (ValueError, TypeError):
        # Si subject no se puede convertir a int
        return None