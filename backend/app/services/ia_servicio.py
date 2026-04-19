"""
Servicio de Inteligencia Artificial para clasificación de incidentes.
Por ahora usa reglas simples. En producción se integraría con modelos de ML reales.
"""
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def clasificar_incidente_por_texto(descripcion: str) -> Dict[str, Any]:
    """
    Clasifica un incidente basado en la descripción textual.
    Retorna: {clasificacion, prioridad, palabras_clave_encontradas}
    """
    desc_lower = descripcion.lower()
    
    # Palabras clave por tipo de incidente
    patrones = {
        "bateria": {
            "palabras": ["bateria", "batería", "no enciende", "no prende", "arranque", "corriente", "electrica", "eléctrica", "luz", "tablero apagado"],
            "prioridad": "media"
        },
        "llanta": {
            "palabras": ["llanta", "neumatico", "neumático", "pinchazo", "desinflada", "ponchada", "rueda", "goma"],
            "prioridad": "media"
        },
        "choque": {
            "palabras": ["choque", "accidente", "colision", "colisión", "golpe", "chocado", "impacto", "chocó"],
            "prioridad": "alta"
        },
        "motor": {
            "palabras": ["motor", "humo", "calentamiento", "sobrecalentado", "recalentado", "ruido motor", "falla motor", "aceite"],
            "prioridad": "alta"
        },
        "llave": {
            "palabras": ["llave", "cerrado", "dentro", "perdí", "perdi", "cerre", "cerré", "cerradas", "cerré las puertas"],
            "prioridad": "baja"
        }
    }
    
    coincidencias = {}
    for tipo, config in patrones.items():
        for palabra in config["palabras"]:
            if palabra in desc_lower:
                if tipo not in coincidencias:
                    coincidencias[tipo] = 0
                coincidencias[tipo] += 1
    
    # Determinar la mejor clasificación
    if coincidencias:
        mejor_tipo = max(coincidencias, key=lambda t: coincidencias[t])
        prioridad = patrones[mejor_tipo]["prioridad"]
        return {
            "clasificacion": mejor_tipo,
            "prioridad": prioridad,
            "confianza": min(0.5 + (coincidencias[mejor_tipo] * 0.1), 0.95),
            "palabras_encontradas": coincidencias
        }
    
    # Si no hay coincidencias
    return {
        "clasificacion": "incierto",
        "prioridad": "media",
        "confianza": 0.3,
        "palabras_encontradas": {}
    }


def generar_resumen_ia(descripcion: str, clasificacion: str, confianza: float) -> str:
    """Genera un resumen automático del incidente."""
    mapa_clasificacion = {
        "bateria": "problema eléctrico / batería",
        "llanta": "pinchazo o daño en neumático",
        "choque": "colisión o accidente vehicular",
        "motor": "falla o sobrecalentamiento del motor",
        "llave": "problema con llaves del vehículo",
        "incierto": "situación no claramente identificada"
    }
    
    tipo_texto = mapa_clasificacion.get(clasificacion, "incidente vehicular")
    confianza_texto = "alta" if confianza > 0.7 else "media" if confianza > 0.4 else "baja"
    
    return f"[IA] Incidente clasificado como {tipo_texto} (confianza {confianza_texto}). Descripción del usuario: {descripcion[:200]}"


def transcribir_audio_simulado(ruta_audio: str | None) -> str | None:
    """
    Simula la transcripción de audio.
    En producción, aquí se llamaría a Whisper API o similar.
    """
    if not ruta_audio:
        return None
    
    # Por ahora retorna None indicando que no se procesó audio
    # En pruebas reales, se podría leer el archivo y simular
    logger.info(f"Audio recibido en: {ruta_audio} (transcripción simulada pendiente)")
    return None