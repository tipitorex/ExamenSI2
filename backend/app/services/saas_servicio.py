from sqlalchemy import MetaData
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.tenant_context import aplicar_search_path_tenant, normalizar_schema_tenant
from app.models.platform import CodigoPlan, PlanPlataforma, Tenant, TenantSuscripcion


def asegurar_planes_base(db: Session) -> None:
    existentes = db.scalars(select(PlanPlataforma)).all()
    codigos_existentes = {plan.codigo for plan in existentes}

    planes_por_defecto: list[PlanPlataforma] = []
    if CodigoPlan.FREE not in codigos_existentes:
        planes_por_defecto.append(
            PlanPlataforma(
                codigo=CodigoPlan.FREE,
                nombre="Plan Free",
                descripcion="Ideal para pruebas con limites operativos basicos.",
                activo=True,
            )
        )
    if CodigoPlan.PRO not in codigos_existentes:
        planes_por_defecto.append(
            PlanPlataforma(
                codigo=CodigoPlan.PRO,
                nombre="Plan Pro",
                descripcion="Acceso completo a todas las funciones de la plataforma.",
                activo=True,
            )
        )

    if planes_por_defecto:
        db.add_all(planes_por_defecto)
        db.commit()


def aprovisionar_schema_tenant(db: Session, schema_name: str) -> None:
    schema_tenant = normalizar_schema_tenant(schema_name)
    db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_tenant}"'))
    db.commit()

    # Create tenant business tables explicitly in tenant schema.
    tenant_metadata = MetaData()
    for table in Base.metadata.sorted_tables:
        if table.schema == "public":
            continue
        table.to_metadata(tenant_metadata, schema=schema_tenant)

    tenant_metadata.create_all(bind=db.connection())

    # Keep the active transaction context aligned to the tenant after provisioning.
    aplicar_search_path_tenant(db, schema_tenant)
    db.commit()


def crear_tenant_con_plan(db: Session, nombre: str, slug: str, schema_name: str, plan_codigo: CodigoPlan) -> Tenant:
    tenant = Tenant(
        nombre=nombre,
        slug=slug,
        schema_name=normalizar_schema_tenant(schema_name),
        activo=True,
    )
    db.add(tenant)
    db.flush()

    plan = db.scalar(select(PlanPlataforma).where(PlanPlataforma.codigo == plan_codigo))
    if plan is None:
        raise ValueError(f"No existe el plan solicitado: {plan_codigo}")

    db.add(
        TenantSuscripcion(
            tenant_id=tenant.id,
            plan_id=plan.id,
            activa=True,
        )
    )
    db.commit()
    db.refresh(tenant)

    aprovisionar_schema_tenant(db, tenant.schema_name)
    return tenant