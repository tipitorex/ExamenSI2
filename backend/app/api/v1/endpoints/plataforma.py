from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_super_admin_actual
from app.db.tenant_context import aplicar_search_path_tenant
from app.models.platform import UsuarioPlataforma
from app.schemas.plataforma import (
    SuperAdminInicioSesion,
    SuperAdminTokenRespuesta,
    TenantAdminRespuesta,
    TenantCambiarEstadoRequest,
    TenantCambiarPlanRequest,
    UsuarioPlataformaRespuesta,
)
from app.services.autenticacion_servicio import crear_token_acceso
from app.services.plataforma_servicio import (
    autenticar_super_admin,
    cambiar_estado_tenant,
    cambiar_plan_tenant,
    listar_tenants,
    obtener_tenant_por_id,
    tenant_a_resumen,
)

router = APIRouter()


@router.post("/auth/iniciar-sesion")
def iniciar_sesion_super_admin(payload: SuperAdminInicioSesion, db: Session = Depends(get_db)) -> SuperAdminTokenRespuesta:
    aplicar_search_path_tenant(db, "public")
    usuario = autenticar_super_admin(db, payload.email, payload.contrasena)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    token = crear_token_acceso(
        subject=str(usuario.id),
        tipo="platform",
        tenant_id=0,
        tenant_slug="public",
        tenant_schema="public",
        rol=usuario.rol.value,
    )
    return SuperAdminTokenRespuesta(
        token_acceso=token,
        tipo_token="bearer",
        usuario=UsuarioPlataformaRespuesta.model_validate(usuario),
    )


@router.get("/tenants")
def obtener_tenants(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: UsuarioPlataforma = Depends(obtener_super_admin_actual),
) -> list[TenantAdminRespuesta]:
    aplicar_search_path_tenant(db, "public")
    tenants = listar_tenants(db, skip=skip, limit=limit)
    return [TenantAdminRespuesta(**tenant_a_resumen(tenant)) for tenant in tenants]


@router.patch("/tenants/{tenant_id}/plan")
def actualizar_plan_tenant(
    tenant_id: int,
    payload: TenantCambiarPlanRequest,
    db: Session = Depends(get_db),
    _: UsuarioPlataforma = Depends(obtener_super_admin_actual),
) -> TenantAdminRespuesta:
    aplicar_search_path_tenant(db, "public")
    tenant = obtener_tenant_por_id(db, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

    actualizado = cambiar_plan_tenant(db, tenant, payload.plan_codigo)
    return TenantAdminRespuesta(**tenant_a_resumen(actualizado))


@router.patch("/tenants/{tenant_id}/estado")
def actualizar_estado_tenant(
    tenant_id: int,
    payload: TenantCambiarEstadoRequest,
    db: Session = Depends(get_db),
    _: UsuarioPlataforma = Depends(obtener_super_admin_actual),
) -> TenantAdminRespuesta:
    aplicar_search_path_tenant(db, "public")
    tenant = obtener_tenant_por_id(db, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant no encontrado")

    actualizado = cambiar_estado_tenant(db, tenant, payload.estado, payload.activo)
    return TenantAdminRespuesta(**tenant_a_resumen(actualizado))
