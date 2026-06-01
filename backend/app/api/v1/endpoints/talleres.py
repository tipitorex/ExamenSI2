from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_taller_actual
from app.db.tenant_context import aplicar_search_path_tenant
from app.models.taller import Taller
from app.schemas.taller import TallerCrear, TallerInicioSesion, TallerRegistroRespuesta, TallerRespuesta, TallerTokenRespuesta
from app.services.autenticacion_servicio import autenticar_taller, crear_token_acceso
from app.services.saas_servicio import crear_tenant_con_plan
from app.services.tenant_servicio import generar_slug_tenant_unico, obtener_tenant_por_slug, schema_desde_slug
from app.services.taller_servicio import crear_taller, obtener_taller_por_email
from app.models.platform import CodigoPlan

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
def registrar_taller(payload: TallerCrear, db: Session = Depends(get_db)) -> TallerRegistroRespuesta:
    aplicar_search_path_tenant(db, "public")

    tenant_slug = generar_slug_tenant_unico(db, payload.nombre)
    tenant_schema = schema_desde_slug(tenant_slug)

    tenant = crear_tenant_con_plan(
        db=db,
        nombre=payload.nombre,
        slug=tenant_slug,
        schema_name=tenant_schema,
        plan_codigo=CodigoPlan(payload.plan_codigo),
    )

    aplicar_search_path_tenant(db, tenant.schema_name)

    taller_existente = obtener_taller_por_email(db, payload.email)
    if taller_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo del taller ya se encuentra registrado en este tenant",
        )

    taller = crear_taller(db, payload)
    return TallerRegistroRespuesta(
        tenant_slug=tenant.slug,
        tenant_schema=tenant.schema_name,
        taller=serializar_taller(taller),
    )


@router.post("/iniciar-sesion")
def iniciar_sesion_taller(payload: TallerInicioSesion, db: Session = Depends(get_db)) -> TallerTokenRespuesta:
    aplicar_search_path_tenant(db, "public")
    tenant = obtener_tenant_por_slug(db, payload.tenant_slug)
    if tenant is None or not tenant.activo:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tenant invalido o inactivo")

    aplicar_search_path_tenant(db, tenant.schema_name)
    taller = autenticar_taller(db, payload.email, payload.contrasena)
    if taller is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    token_acceso = crear_token_acceso(
        subject=str(taller.id),
        tipo="taller",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_schema=tenant.schema_name,
    )
    return TallerTokenRespuesta(
        token_acceso=token_acceso,
        tipo_token="bearer",
        tenant_slug=tenant.slug,
        tenant_schema=tenant.schema_name,
        taller=serializar_taller(taller),
    )


@router.get("/perfil")
def obtener_perfil_taller(taller_actual: Taller = Depends(obtener_taller_actual)) -> TallerRespuesta:
    return serializar_taller(taller_actual)