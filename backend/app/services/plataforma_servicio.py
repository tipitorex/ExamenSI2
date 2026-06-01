from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.models.platform import (
    CodigoPlan,
    EstadoTenant,
    PlanPlataforma,
    RolUsuarioPlataforma,
    Tenant,
    TenantSuscripcion,
    UsuarioPlataforma,
)
from app.services.autenticacion_servicio import (
    obtener_hash_contrasena,
    verificar_contrasena,
)


def obtener_usuario_plataforma_por_email(db: Session, email: str) -> UsuarioPlataforma | None:
    consulta: Select[tuple[UsuarioPlataforma]] = select(UsuarioPlataforma).where(UsuarioPlataforma.email == email)
    return db.scalar(consulta)


def asegurar_super_admin_inicial(db: Session) -> None:
    existente = obtener_usuario_plataforma_por_email(db, settings.platform_owner_email)
    if existente is not None:
        return

    usuario = UsuarioPlataforma(
        nombre="Owner",
        email=settings.platform_owner_email,
        contrasena_hash=obtener_hash_contrasena(settings.platform_owner_password),
        rol=RolUsuarioPlataforma.SUPER_ADMIN,
        activo=True,
    )
    db.add(usuario)
    db.commit()


def autenticar_super_admin(db: Session, email: str, contrasena: str) -> UsuarioPlataforma | None:
    usuario = obtener_usuario_plataforma_por_email(db, email)
    if usuario is None or not usuario.activo:
        return None

    if usuario.rol != RolUsuarioPlataforma.SUPER_ADMIN:
        return None

    if not verificar_contrasena(contrasena, usuario.contrasena_hash):
        return None

    return usuario


def _obtener_plan_activo_tenant(tenant: Tenant) -> str | None:
    activas = [sus for sus in tenant.suscripciones if sus.activa]
    if not activas:
        return None
    ultima = sorted(activas, key=lambda item: item.id, reverse=True)[0]
    return ultima.plan.codigo.value


def listar_tenants(db: Session, skip: int, limit: int) -> list[Tenant]:
    consulta: Select[tuple[Tenant]] = (
        select(Tenant)
        .order_by(Tenant.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(consulta).unique())


def obtener_tenant_por_id(db: Session, tenant_id: int) -> Tenant | None:
    return db.get(Tenant, tenant_id)


def cambiar_plan_tenant(db: Session, tenant: Tenant, plan_codigo: str) -> Tenant:
    plan = db.scalar(select(PlanPlataforma).where(PlanPlataforma.codigo == CodigoPlan(plan_codigo)))
    if plan is None:
        raise ValueError("Plan no encontrado")

    ahora = datetime.now(UTC)
    for suscripcion in tenant.suscripciones:
        if suscripcion.activa:
            suscripcion.activa = False
            suscripcion.finaliza_en = ahora
            db.add(suscripcion)

    nueva = TenantSuscripcion(
        tenant_id=tenant.id,
        plan_id=plan.id,
        activa=True,
    )
    db.add(nueva)
    db.commit()
    db.refresh(tenant)
    return tenant


def cambiar_estado_tenant(db: Session, tenant: Tenant, estado: str, activo: bool) -> Tenant:
    tenant.estado = EstadoTenant(estado)
    tenant.activo = activo
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


def tenant_a_resumen(tenant: Tenant) -> dict:
    return {
        "id": tenant.id,
        "nombre": tenant.nombre,
        "slug": tenant.slug,
        "schema_name": tenant.schema_name,
        "estado": tenant.estado.value,
        "activo": tenant.activo,
        "plan_actual": _obtener_plan_activo_tenant(tenant),
        "creado_en": tenant.creado_en,
    }
