"""
Servicio de Inteligencia Artificial para clasificación de incidentes.
Ahora integra transcripción real de audio y mejora la clasificación.
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def clasificar_incidente_por_texto(descripcion: str, transcripcion_audio: Optional[str] = None) -> Dict[str, Any]:
    """
    Clasifica un incidente basado en la descripción textual y transcripción de audio.
    
    Args:
        descripcion: Texto escrito por el usuario
        transcripcion_audio: Texto transcrito del audio (opcional)
    
    Returns:
        Dict con clasificacion, prioridad, confianza, etc.
    """
    # Combinar descripción y transcripción para mejor análisis
    texto_completo = descripcion.lower()
    if transcripcion_audio:
        texto_completo += " " + transcripcion_audio.lower()
        logger.info(f"🎤 Usando transcripción de audio para clasificación")
    
    # Palabras clave por tipo de incidente (mejoradas)
    patrones = {
        "bateria": {
            "palabras": [
                "bateria", "batería", "no enciende", "no prende", "no arranca",
                "arranque", "corriente", "electrica", "eléctrica", "luz", 
                "tablero apagado", "no da marcha", "clic", "muerta", "descargada"
            ],
            "prioridad": "media"
        },
        "llanta": {
            "palabras": [
                "llanta", "neumatico", "neumático", "pinchazo", "desinflada",
                "ponchada", "rueda", "goma", "baja", "aire", "piso"
            ],
            "prioridad": "media"
        },
        "choque": {
            "palabras": [
                "choque", "accidente", "colision", "colisión", "golpe", 
                "chocado", "impacto", "chocó", "abollado", "rotura"
            ],
            "prioridad": "alta"
        },
        "motor": {
            "palabras": [
                "motor", "humo", "calentamiento", "sobrecalentado", "recalentado",
                "ruido motor", "falla motor", "aceite", "fuga", "temblor", "vibra"
            ],
            "prioridad": "alta"
        },
        "llave": {
            "palabras": [
                "llave", "cerrado", "dentro", "perdí", "perdi", "cerre", "cerré",
                "cerradas", "cerré las puertas", "encerré", "encerre", "seguro"
            ],
            "prioridad": "baja"
        },
        "grua": {
            "palabras": [
                "grua", "grúa", "remolque", "arrastre", "movilizar", "trasladar"
            ],
            "prioridad": "media"
        }
    }
    
    # Contar coincidencias
    coincidencias = {}
    for tipo, config in patrones.items():
        for palabra in config["palabras"]:
            if palabra in texto_completo:
                if tipo not in coincidencias:
                    coincidencias[tipo] = 0
                coincidencias[tipo] += 1
    
    # Dar peso extra a ciertas palabras clave (emergencia)
    palabras_emergencia = ["choque", "accidente", "humo", "fuego"]
    for palabra in palabras_emergencia:
        if palabra in texto_completo:
            if "choque" not in coincidencias:
                coincidencias["choque"] = 0
            coincidencias["choque"] += 3  # Peso extra
    
    # Determinar la mejor clasificación
    if coincidencias:
        mejor_tipo = max(coincidencias, key=lambda t: coincidencias[t])
        prioridad = patrones[mejor_tipo]["prioridad"]
        
        # Ajustar prioridad si hay palabras de emergencia
        if mejor_tipo == "choque" or any(p in texto_completo for p in palabras_emergencia):
            prioridad = "alta"
        
        confianza = min(0.5 + (coincidencias[mejor_tipo] * 0.1), 0.95)
        
        return {
            "clasificacion": mejor_tipo,
            "prioridad": prioridad,
            "confianza": round(confianza, 2),
            "palabras_encontradas": coincidencias,
            "uso_transcripcion": transcripcion_audio is not None
        }
    
    # Si no hay coincidencias
    return {
        "clasificacion": "incierto",
        "prioridad": "media",
        "confianza": 0.3,
        "palabras_encontradas": {},
        "uso_transcripcion": transcripcion_audio is not None
    }


def generar_resumen_ia(descripcion: str, clasificacion: str, confianza: float, transcripcion: Optional[str] = None) -> str:
    """Genera un resumen automático del incidente, incluyendo transcripción si existe."""
    mapa_clasificacion = {
        "bateria": "problema eléctrico / batería",
        "llanta": "pinchazo o daño en neumático",
        "choque": "colisión o accidente vehicular",
        "motor": "falla o sobrecalentamiento del motor",
        "llave": "problema con llaves del vehículo",
        "grua": "necesidad de grúa o remolque",
        "incierto": "situación no claramente identificada"
    }
    
    tipo_texto = mapa_clasificacion.get(clasificacion, "incidente vehicular")
    confianza_texto = "alta" if confianza > 0.7 else "media" if confianza > 0.4 else "baja"
    
    resumen = f"[IA] Incidente clasificado como {tipo_texto} (confianza {confianza_texto})."
    
    if transcripcion:
        resumen += f" Audio del usuario: '{transcripcion[:150]}...'"
    else:
        resumen += f" Descripción del usuario: {descripcion[:150]}"
    
    return resumen


def mejorar_descripcion_con_ia(descripcion: str, transcripcion: Optional[str]) -> str:
    """
    Mejora la descripción del incidente combinando texto escrito y transcripción.
    """
    if not transcripcion:
        return descripcion
    
    # Si la descripción está vacía o es muy corta, usar transcripción
    if not descripcion or len(descripcion) < 10:
        return f"Reporte por voz: {transcripcion}"
    
    # Si ambas tienen información, combinarlas
    return f"{descripcion}\n\n📝 Transcripción del audio: {transcripcion}"