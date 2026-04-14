from fastapi import APIRouter

router = APIRouter()


@router.get("/salud")
def verificar_salud() -> dict[str, str]:
    return {"status": "ok"}
