import re
import unicodedata

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.platform import Tenant


def slugificar_tenant(valor: str) -> str:
    normalizado = unicodedata.normalize("NFKD", valor).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalizado).strip("-").lower()
    return slug or "taller"


def schema_desde_slug(slug: str) -> str:
    return f"tenant_{slug.replace('-', '_')}"


def obtener_tenant_por_slug(db: Session, tenant_slug: str) -> Tenant | None:
    consulta: Select[tuple[Tenant]] = select(Tenant).where(Tenant.slug == tenant_slug)
    return db.scalar(consulta)


def generar_slug_tenant_unico(db: Session, nombre_base: str) -> str:
    base = slugificar_tenant(nombre_base)
    candidato = base
    secuencia = 2

    while obtener_tenant_por_slug(db, candidato) is not None:
        candidato = f"{base}-{secuencia}"
        secuencia += 1

    return candidato
