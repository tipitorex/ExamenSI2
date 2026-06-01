import argparse

from app.db.session import SessionLocal
from app.models.platform import CodigoPlan
from app.services.saas_servicio import crear_tenant_con_plan


def main() -> None:
    parser = argparse.ArgumentParser(description="Provisiona un tenant con plan inicial")
    parser.add_argument("--nombre", required=True, help="Nombre comercial del tenant")
    parser.add_argument("--slug", required=True, help="Slug unico del tenant")
    parser.add_argument("--schema", required=True, help="Schema PostgreSQL del tenant")
    parser.add_argument("--plan", default="free", choices=["free", "pro"], help="Plan inicial")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        plan_codigo = CodigoPlan.FREE if args.plan == "free" else CodigoPlan.PRO
        tenant = crear_tenant_con_plan(
            db=db,
            nombre=args.nombre,
            slug=args.slug,
            schema_name=args.schema,
            plan_codigo=plan_codigo,
        )
        print(f"Tenant creado: id={tenant.id} slug={tenant.slug} schema={tenant.schema_name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
