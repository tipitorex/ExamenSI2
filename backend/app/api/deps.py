from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.db.tenant_context import aplicar_search_path_tenant
from app.db.session import SessionLocal
from app.models.cliente import Cliente
from app.models.platform import EstadoTenant, RolUsuarioPlataforma, Tenant, UsuarioPlataforma
from app.models.taller import Taller
from app.services.autenticacion_servicio import decodificar_token_acceso

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/autenticacion/iniciar-sesion")
oauth2_scheme_taller = OAuth2PasswordBearer(tokenUrl="/api/v1/talleres/iniciar-sesion")
oauth2_scheme_platform = OAuth2PasswordBearer(tokenUrl="/api/v1/plataforma/auth/iniciar-sesion")


def _obtener_tenant_activo(
    db: Session,
    tenant_id: int,
    tenant_slug: str,
    tenant_schema: str,
    excepcion_credenciales: HTTPException,
) -> Tenant:
    try:
        aplicar_search_path_tenant(db, "public")
    except ValueError:
        raise excepcion_credenciales from None

    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if tenant is None:
        raise excepcion_credenciales

    if tenant.slug != tenant_slug or tenant.schema_name != tenant_schema:
        raise excepcion_credenciales

    if not tenant.activo or tenant.estado != EstadoTenant.ACTIVO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant suspendido o inactivo",
        )

    return tenant


def get_db(request: Request) -> Session:
    db = SessionLocal()
    try:
        schema_solicitado = request.headers.get(settings.tenant_header_name, settings.tenant_default_schema)
        try:
            aplicar_search_path_tenant(db, schema_solicitado)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
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
        payload = decodificar_token_acceso(token)
        subject = payload.get("sub")
        tipo = payload.get("tipo", "cliente")
        tenant_id = payload.get("tenant_id")
        tenant_slug = payload.get("tenant_slug")
        tenant_schema = payload.get("tenant_schema")
        if subject is None:
            raise excepcion_credenciales
        if tipo != "cliente":
            raise excepcion_credenciales
        if tenant_id is None or not tenant_slug or not tenant_schema:
            raise excepcion_credenciales
        tenant_id = int(tenant_id)
        cliente_id = int(subject)
    except (JWTError, ValueError):
        raise excepcion_credenciales from None

    _obtener_tenant_activo(db, tenant_id, tenant_slug, tenant_schema, excepcion_credenciales)

    try:
        aplicar_search_path_tenant(db, tenant_schema)
    except ValueError:
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
        payload = decodificar_token_acceso(token)
        subject = payload.get("sub")
        tipo = payload.get("tipo")
        tenant_id = payload.get("tenant_id")
        tenant_slug = payload.get("tenant_slug")
        tenant_schema = payload.get("tenant_schema")
        if subject is None or tipo != "taller" or tenant_id is None or not tenant_slug or not tenant_schema:
            raise excepcion_credenciales
        tenant_id = int(tenant_id)
        taller_id = int(subject)
    except (JWTError, ValueError):
        raise excepcion_credenciales from None

    _obtener_tenant_activo(db, tenant_id, tenant_slug, tenant_schema, excepcion_credenciales)

    try:
        aplicar_search_path_tenant(db, tenant_schema)
    except ValueError:
        raise excepcion_credenciales from None

    taller = db.get(Taller, taller_id)
    if taller is None:
        raise excepcion_credenciales

    return taller


def obtener_super_admin_actual(
    token: str = Depends(oauth2_scheme_platform),
    db: Session = Depends(get_db),
) -> UsuarioPlataforma:
    excepcion_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token de plataforma",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decodificar_token_acceso(token)
        subject = payload.get("sub")
        tipo = payload.get("tipo")
        rol = payload.get("rol")
        if subject is None or tipo != "platform" or rol != RolUsuarioPlataforma.SUPER_ADMIN.value:
            raise excepcion_credenciales
        usuario_id = int(subject)
    except (JWTError, ValueError):
        raise excepcion_credenciales from None

    try:
        aplicar_search_path_tenant(db, "public")
    except ValueError:
        raise excepcion_credenciales from None

    usuario = db.get(UsuarioPlataforma, usuario_id)
    if usuario is None or not usuario.activo:
        raise excepcion_credenciales

    return usuario