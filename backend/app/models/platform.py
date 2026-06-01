from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EstadoTenant(str, Enum):
    ACTIVO = "activo"
    SUSPENDIDO = "suspendido"
    INACTIVO = "inactivo"


class CodigoPlan(str, Enum):
    FREE = "free"
    PRO = "pro"


class Tenant(Base):
    __tablename__ = "tenants"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_tenant_slug"),
        UniqueConstraint("schema_name", name="uq_tenant_schema_name"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    schema_name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    estado: Mapped[EstadoTenant] = mapped_column(
        SqlEnum(EstadoTenant, name="estado_tenant", schema="public"),
        default=EstadoTenant.ACTIVO,
        nullable=False,
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    suscripciones: Mapped[list["TenantSuscripcion"]] = relationship(
        back_populates="tenant",
        cascade="all, delete-orphan",
    )


class PlanPlataforma(Base):
    __tablename__ = "planes_plataforma"
    __table_args__ = (
        UniqueConstraint("codigo", name="uq_plan_codigo"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[CodigoPlan] = mapped_column(
        SqlEnum(CodigoPlan, name="codigo_plan", schema="public"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(80), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    suscripciones: Mapped[list["TenantSuscripcion"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class TenantSuscripcion(Base):
    __tablename__ = "tenant_suscripciones"
    __table_args__ = ({"schema": "public"},)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("public.tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("public.planes_plataforma.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    inicia_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finaliza_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant: Mapped["Tenant"] = relationship(back_populates="suscripciones")
    plan: Mapped["PlanPlataforma"] = relationship(back_populates="suscripciones")


class RolUsuarioPlataforma(str, Enum):
    SUPER_ADMIN = "super_admin"
    SOPORTE = "soporte"


class UsuarioPlataforma(Base):
    __tablename__ = "usuarios_plataforma"
    __table_args__ = (
        UniqueConstraint("email", name="uq_usuario_plataforma_email"),
        {"schema": "public"},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuarioPlataforma] = mapped_column(
        SqlEnum(RolUsuarioPlataforma, name="rol_usuario_plataforma", schema="public"),
        default=RolUsuarioPlataforma.SUPER_ADMIN,
        nullable=False,
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)