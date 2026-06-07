from fastapi import APIRouter

router = APIRouter()


@router.get("/salud")
def verificar_salud() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/salud/gemini-modelos")
def listar_modelos_gemini():
    """Temporal: lista los modelos Gemini disponibles con esta API key."""
    try:
        from google import genai
        from app.core.settings import settings
        client = genai.Client(api_key=settings.gemini_api_key)
        modelos = [m.name for m in client.models.list() if "gemini" in m.name.lower()]
        return {"modelos": modelos}
    except Exception as e:
        return {"error": str(e)}
