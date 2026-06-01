from collections.abc import Generator
from contextlib import contextmanager
import re

from sqlalchemy import text
from sqlalchemy.orm import Session


def normalizar_schema_tenant(schema_name: str | None) -> str:
    if not schema_name:
        return "public"

    limpio = schema_name.strip().lower()
    if not limpio:
        return "public"

    if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", limpio):
        raise ValueError("Nombre de schema tenant invalido")

    return limpio


def aplicar_search_path_tenant(db: Session, schema_name: str | None) -> None:
    schema_tenant = normalizar_schema_tenant(schema_name)

    # Keep public at the end so platform tables remain reachable.
    # Use session-level scope (is_local=false) so search_path survives commit/refresh cycles
    # within the same request/session.
    db.execute(
        text("SELECT set_config('search_path', :search_path, false)"),
        {"search_path": f"{schema_tenant},public"},
    )


@contextmanager
def contexto_tenant(db: Session, schema_name: str | None) -> Generator[Session, None, None]:
    aplicar_search_path_tenant(db, schema_name)
    try:
        yield db
    finally:
        # Explicit reset keeps behavior predictable for long-lived sessions.
        db.execute(text("RESET search_path"))