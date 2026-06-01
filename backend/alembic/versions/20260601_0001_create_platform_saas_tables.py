"""create platform SaaS tables in public schema

Revision ID: 20260601_0001
Revises:
Create Date: 2026-06-01 00:00:00

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260601_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS public")

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_tenant') THEN
                CREATE TYPE public.estado_tenant AS ENUM ('activo', 'suspendido', 'inactivo');
            END IF;
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'codigo_plan') THEN
                CREATE TYPE public.codigo_plan AS ENUM ('free', 'pro');
            END IF;
        END$$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario_plataforma') THEN
                CREATE TYPE public.rol_usuario_plataforma AS ENUM ('super_admin', 'soporte');
            END IF;
        END$$;
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.tenants (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            slug VARCHAR(80) NOT NULL,
            schema_name VARCHAR(80) NOT NULL,
            estado public.estado_tenant NOT NULL DEFAULT 'activo',
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_slug ON public.tenants(slug)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_schema_name ON public.tenants(schema_name)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.planes_plataforma (
            id SERIAL PRIMARY KEY,
            codigo public.codigo_plan NOT NULL,
            nombre VARCHAR(80) NOT NULL,
            descripcion TEXT NULL,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_codigo ON public.planes_plataforma(codigo)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.tenant_suscripciones (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
            plan_id INTEGER NOT NULL REFERENCES public.planes_plataforma(id) ON DELETE RESTRICT,
            activa BOOLEAN NOT NULL DEFAULT TRUE,
            inicia_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            finaliza_en TIMESTAMPTZ NULL
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS public.usuarios_plataforma (
            id SERIAL PRIMARY KEY,
            nombre VARCHAR(150) NOT NULL,
            email VARCHAR(255) NOT NULL,
            contrasena_hash VARCHAR(255) NOT NULL,
            rol public.rol_usuario_plataforma NOT NULL DEFAULT 'super_admin',
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_plataforma_email ON public.usuarios_plataforma(email)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.usuarios_plataforma")
    op.execute("DROP TABLE IF EXISTS public.tenant_suscripciones")
    op.execute("DROP TABLE IF EXISTS public.planes_plataforma")
    op.execute("DROP TABLE IF EXISTS public.tenants")

    op.execute("DROP TYPE IF EXISTS public.rol_usuario_plataforma")
    op.execute("DROP TYPE IF EXISTS public.codigo_plan")
    op.execute("DROP TYPE IF EXISTS public.estado_tenant")
