"""
Servicio de visión artificial usando Google Gemini Flash (google-genai SDK).
Requiere GEMINI_API_KEY en variables de entorno.
"""
import json
import logging
from pathlib import Path
from typing import Dict, Any

from app.core.settings import settings

try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_DISPONIBLE = True
except ImportError:
    genai = None  # type: ignore
    genai_types = None  # type: ignore
    _GENAI_DISPONIBLE = False

logger = logging.getLogger(__name__)

CATEGORIAS_VALIDAS = {"bateria", "llanta", "choque", "motor", "llave", "grua", "incierto"}

PROMPT_ANALISIS = """Eres un experto en análisis de daños y problemas vehiculares.
Analiza esta imagen y determina qué tipo de problema tiene el vehículo.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni bloques markdown:
{
  "clasificacion": "<una de: bateria|llanta|choque|motor|llave|grua|incierto>",
  "confianza": <número decimal entre 0.0 y 1.0>,
  "descripcion_dano": "<descripción breve en español de lo que observas, máximo 200 caracteres>"
}

Criterios:
- bateria: vehículo no enciende, batería visible, cables de arranque, tablero sin energía
- llanta: llanta ponchada, desinflada, visiblemente dañada o reventada
- choque: golpes, abolladuras, cristales rotos, daños por colisión o impacto
- motor: humo saliendo del motor, fuga de aceite, piezas mecánicas dañadas visibles
- llave: problema con cerradura, llave rota, puerta bloqueada
- grua: vehículo volcado, en zanja, o que claramente necesita remolque
- incierto: la imagen no permite determinar el problema con claridad

Sé preciso y conciso en la descripcion_dano."""


class VisionService:

    def __init__(self):
        self._configurado = False
        self._client = None

        if not _GENAI_DISPONIBLE:
            logger.warning("⚠️ Paquete google-genai no instalado. Reconstruye la imagen Docker.")
            return

        if settings.gemini_api_key:
            try:
                self._client = genai.Client(api_key=settings.gemini_api_key)
                self._configurado = True
                logger.info("✅ Gemini Flash Vision configurado correctamente")
            except Exception as e:
                logger.error(f"❌ Error configurando Gemini: {e}")
        else:
            logger.warning("⚠️ GEMINI_API_KEY no configurada. El análisis de imágenes está desactivado.")

    async def clasificar_imagen(self, ruta_imagen: str) -> Dict[str, Any]:
        """Analiza una imagen con Gemini Flash y retorna clasificación + descripción del daño."""
        if not self._configurado or self._client is None:
            return {
                "clasificacion": "incierto",
                "confianza": 0.0,
                "descripcion_dano": None,
                "error": "Gemini no configurado",
            }

        ruta = Path(ruta_imagen)
        if not ruta.exists():
            return {
                "clasificacion": "incierto",
                "confianza": 0.0,
                "descripcion_dano": None,
                "error": "Imagen no encontrada",
            }

        try:
            with open(ruta, "rb") as f:
                imagen_bytes = f.read()

            extension = ruta.suffix.lower()
            mime_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
            }
            mime_type = mime_map.get(extension, "image/jpeg")

            respuesta = await self._client.aio.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=[
                    genai_types.Part.from_bytes(data=imagen_bytes, mime_type=mime_type),
                    PROMPT_ANALISIS,
                ],
            )

            texto = respuesta.text.strip()

            # Limpiar bloque markdown si Gemini lo añade
            if "```" in texto:
                for parte in texto.split("```"):
                    if "{" in parte:
                        texto = parte.strip().lstrip("json").strip()
                        break

            resultado = json.loads(texto)

            clasificacion = str(resultado.get("clasificacion", "incierto")).lower()
            if clasificacion not in CATEGORIAS_VALIDAS:
                clasificacion = "incierto"

            confianza = float(resultado.get("confianza", 0.5))
            confianza = max(0.0, min(1.0, confianza))

            descripcion = str(resultado.get("descripcion_dano", "")).strip() or None

            logger.info(f"🔍 Gemini → {clasificacion} ({confianza:.2f}) | {descripcion}")

            return {
                "clasificacion": clasificacion,
                "confianza": round(confianza, 2),
                "descripcion_dano": descripcion,
            }

        except json.JSONDecodeError as e:
            logger.error(f"❌ Gemini no devolvió JSON válido: {e}")
            return {"clasificacion": "incierto", "confianza": 0.0, "descripcion_dano": None, "error": "JSON inválido"}
        except Exception as e:
            logger.error(f"❌ Error en análisis Gemini: {e}")
            return {"clasificacion": "incierto", "confianza": 0.0, "descripcion_dano": None, "error": str(e)}


vision_service = VisionService()
