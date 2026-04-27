import firebase_admin
from firebase_admin import credentials, messaging
import os
from typing import Optional

# Inicializar Firebase (solo una vez)
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK inicializado correctamente")
    except Exception as e:
        print(f"❌ Error inicializando Firebase: {e}")

def enviar_push_notificacion(
    fcm_token: str,
    titulo: str,
    cuerpo: str,
    datos: Optional[dict] = None
) -> bool:
    """Envía una notificación push a un dispositivo"""
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=titulo,
                body=cuerpo,
            ),
            data=datos or {},
            token=fcm_token,
        )
        response = messaging.send(message)
        print(f"✅ Push enviado: {response}")
        return True
    except Exception as e:
        print(f"❌ Error enviando push: {e}")
        return False