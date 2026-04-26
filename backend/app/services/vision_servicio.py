"""
Servicio de visión artificial usando Hugging Face Inference API
Requiere HUGGINGFACE_API_TOKEN en variables de entorno
"""
import logging
import httpx
from typing import Dict, Any, List

from app.core.settings import settings

logger = logging.getLogger(__name__)


class VisionService:
    """Clasificador de daños vehiculares usando Hugging Face API"""
    
    def __init__(self):
        # ✅ Usar settings en lugar de os.getenv
        self.api_token = settings.huggingface_api_token
        # ✅ NUEVO MODELO - SÍ FUNCIONA (SaurabhArora/vehicle_defects)
        self.api_url = "https://api-inference.huggingface.co/models/SaurabhArora/vehicle_defects"
        self._client = None
        
        if not self.api_token:
            logger.warning("⚠️ HUGGINGFACE_API_TOKEN no configurado. El análisis de imágenes no funcionará.")
        else:
            logger.info("✅ Hugging Face API configurada correctamente")
        
        # ✅ MAPEO ACTUALIZADO para el nuevo modelo
        self.mapeo = {
            "deflated tire": "llanta",
            "worn out tire": "llanta",
            "worn out tire tread": "llanta",
            "broken headlight": "choque",
            "damaged windscreen": "choque",
            "vehicle oil leak": "motor",
            "damaged oil filter": "motor"
        }
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Obtiene o crea el cliente HTTP"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client
    
    async def clasificar_imagen(self, ruta_imagen: str) -> Dict[str, Any]:
        """
        Clasifica una imagen usando la API de Hugging Face
        
        Args:
            ruta_imagen: Ruta al archivo de imagen
            
        Returns:
            Dict con clasificacion, confianza, daño_detectado, etc.
        """
        if not self.api_token:
            return {
                "clasificacion": "incierto",
                "confianza": 0.0,
                "error": "API token no configurado"
            }
        
        try:
            # Leer la imagen
            with open(ruta_imagen, "rb") as f:
                imagen_bytes = f.read()
            
            # Llamar a la API
            client = await self._get_client()
            headers = {"Authorization": f"Bearer {self.api_token}"}
            
            response = await client.post(
                self.api_url,
                headers=headers,
                content=imagen_bytes
            )
            
            if response.status_code == 200:
                resultados = response.json()
                
                if resultados and len(resultados) > 0:
                    mejor = resultados[0]
                    clase_original = mejor['label']
                    confianza = mejor['score']
                    clasificacion = self.mapeo.get(clase_original.lower(), "incierto")
                    
                    logger.info(f"🔍 API clasificó: {clase_original} → {clasificacion} (confianza: {confianza:.2f})")
                    
                    return {
                        "clasificacion": clasificacion,
                        "confianza": round(confianza, 2),
                        "daño_detectado": clase_original,
                        "descripcion": f"Se detectó {clase_original} en el vehículo"
                    }
            
            # Si algo falló
            logger.warning(f"⚠️ API respondió con status {response.status_code}")
            return {
                "clasificacion": "incierto",
                "confianza": 0.0,
                "daño_detectado": None,
                "error": f"HTTP {response.status_code}"
            }
            
        except Exception as e:
            logger.error(f"❌ Error en clasificación: {e}")
            return {
                "clasificacion": "incierto",
                "confianza": 0.0,
                "error": str(e)
            }
    
    async def extraer_daños_visibles(self, ruta_imagen: str) -> List[str]:
        """Extrae descripción de daños visibles en la imagen."""
        resultado = await self.clasificar_imagen(ruta_imagen)
        if resultado.get("daño_detectado"):
            return [resultado.get("descripcion", "Daño detectado")]
        return []
    
    async def close(self):
        """Cierra el cliente HTTP"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Instancia global
vision_service = VisionService()