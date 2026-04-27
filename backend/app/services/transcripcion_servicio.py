
import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from faster_whisper import WhisperModel

class TranscripcionService:
    def __init__(self):
        self.model_size = "base"  # tiny, base, small, medium, large
        self.device = "cpu"
        self.compute_type = "int8"
        
        print(f"Cargando modelo Whisper {self.model_size}...")
        self.model = WhisperModel(self.model_size, device=self.device, compute_type=self.compute_type)
        print("✅ Modelo Whisper cargado")
    
    async def transcribir(self, archivo_audio: UploadFile) -> dict:
        """Transcribe un archivo de audio a texto"""
        
        # Crear directorio temporal
        temp_dir = Path("/tmp/audio_temp")
        temp_dir.mkdir(exist_ok=True)
        
        # Guardar archivo temporalmente
        archivo_id = str(uuid.uuid4())
        extension = Path(archivo_audio.filename).suffix or ".m4a"
        ruta_temp = temp_dir / f"{archivo_id}{extension}"
        
        try:
            # Guardar archivo
            contenido = await archivo_audio.read()
            with open(ruta_temp, "wb") as f:
                f.write(contenido)
            
            # Transcribir con Whisper
            segments, info = self.model.transcribe(
                str(ruta_temp),
                beam_size=5,
                language=None,  # Auto-detectar
                task="transcribe"
            )
            
            # Unir todos los segmentos
            texto_completo = " ".join([segment.text for segment in segments])
            
            # Resetear posición del archivo para futuros usos
            await archivo_audio.seek(0)
            
            return {
                "texto": texto_completo,
                "idioma": info.language,
                "duracion_segundos": info.duration
            }
            
        except Exception as e:
            raise Exception(f"Error al transcribir: {str(e)}")
        
        finally:
            # Limpiar archivo temporal
            if ruta_temp.exists():
                os.remove(ruta_temp)

# Instancia global
transcripcion_service = TranscripcionService()