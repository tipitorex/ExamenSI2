from types import SimpleNamespace

import pytest
from fastapi import HTTPException, status

from app.api.deps import _obtener_tenant_activo
from app.models.platform import EstadoTenant


class _FakeDB:
    def __init__(self, tenant=None):
        self._tenant = tenant

    def execute(self, *_args, **_kwargs):
        return None

    def scalar(self, *_args, **_kwargs):
        return self._tenant


@pytest.fixture
def cred_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def test_obtener_tenant_activo_ok(cred_exception: HTTPException):
    tenant = SimpleNamespace(
        id=1,
        slug="acme",
        schema_name="tenant_acme",
        activo=True,
        estado=EstadoTenant.ACTIVO,
    )
    db = _FakeDB(tenant=tenant)

    result = _obtener_tenant_activo(
        db=db,
        tenant_id=1,
        tenant_slug="acme",
        tenant_schema="tenant_acme",
        excepcion_credenciales=cred_exception,
    )

    assert result is tenant


def test_obtener_tenant_activo_rechaza_mismatch(cred_exception: HTTPException):
    tenant = SimpleNamespace(
        id=1,
        slug="acme",
        schema_name="tenant_acme",
        activo=True,
        estado=EstadoTenant.ACTIVO,
    )
    db = _FakeDB(tenant=tenant)

    with pytest.raises(HTTPException) as exc_info:
        _obtener_tenant_activo(
            db=db,
            tenant_id=1,
            tenant_slug="otro-slug",
            tenant_schema="tenant_acme",
            excepcion_credenciales=cred_exception,
        )

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_obtener_tenant_activo_rechaza_suspendido(cred_exception: HTTPException):
    tenant = SimpleNamespace(
        id=1,
        slug="acme",
        schema_name="tenant_acme",
        activo=True,
        estado=EstadoTenant.SUSPENDIDO,
    )
    db = _FakeDB(tenant=tenant)

    with pytest.raises(HTTPException) as exc_info:
        _obtener_tenant_activo(
            db=db,
            tenant_id=1,
            tenant_slug="acme",
            tenant_schema="tenant_acme",
            excepcion_credenciales=cred_exception,
        )

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Tenant suspendido o inactivo"
