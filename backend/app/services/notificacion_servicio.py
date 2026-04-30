from sqlalchemy import Select, select
from sqlalchemy.orm import Session
from firebase_admin import messaging

from app.models.notificacion import Notificacion
from app.models.dispositivo import Dispositivo
from app.schemas.notificacion import NotificacionCrear, NotificacionMarcarLeida


def obtener_notificaciones_por_cliente(db: Session, cliente_id: int) -> list[Notificacion]:
    consulta: Select[tuple[Notificacion]] = select(Notificacion).where(
        Notificacion.cliente_id == cliente_id
    ).order_by(Notificacion.fecha_envio.desc())
    return list(db.scalars(consulta))


def obtener_notificaciones_por_taller(db: Session, taller_id: int) -> list[Notificacion]:
    consulta: Select[tuple[Notificacion]] = select(Notificacion).where(
        Notificacion.taller_id == taller_id
    ).order_by(Notificacion.fecha_envio.desc())
    return list(db.scalars(consulta))


def obtener_notificacion_por_id(db: Session, notificacion_id: int) -> Notificacion | None:
    return db.get(Notificacion, notificacion_id)


def crear_notificacion(db: Session, payload: NotificacionCrear) -> Notificacion:
    notificacion = Notificacion(
        cliente_id=payload.cliente_id,
        taller_id=payload.taller_id,
        incidente_id=payload.incidente_id,
        tipo=payload.tipo,
        titulo=payload.titulo,
        mensaje=payload.mensaje,
        datos_extra_json=payload.datos_extra_json,
    )
    db.add(notificacion)
    db.commit()
    db.refresh(notificacion)
    return notificacion


def marcar_notificacion_leida(db: Session, notificacion: Notificacion, payload: NotificacionMarcarLeida) -> Notificacion:
    notificacion.leido = payload.leido
    db.add(notificacion)
    db.commit()
    db.refresh(notificacion)
    return notificacion


def eliminar_notificacion(db: Session, notificacion: Notificacion) -> None:
    db.delete(notificacion)
    db.commit()


# ============================================================
# ENVIAR NOTIFICACIÓN PUSH A TALLER (VERSIÓN CORREGIDA)
# ============================================================

def enviar_notificacion_push_a_taller(taller_id: int, titulo: str, cuerpo: str, datos: dict = None):
    """
    Envía una notificación push a todos los dispositivos web del taller
    
    Args:
        taller_id: ID del taller
        titulo: Título de la notificación
        cuerpo: Cuerpo/mensaje de la notificación
        datos: Datos adicionales (incidente_id, tipo, etc.)
    
    Returns:
        dict: Resultado del envío
    """
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        # Buscar dispositivos web activos del taller
        dispositivos = db.query(Dispositivo).filter(
            Dispositivo.taller_id == taller_id,
            Dispositivo.plataforma == "web",
            Dispositivo.activo == True
        ).all()
        
        if not dispositivos:
            print(f"⚠️ No hay dispositivos web registrados para el taller {taller_id}")
            return {"success": False, "message": "No hay dispositivos registrados"}
        
        success_count = 0
        failure_count = 0
        
        # Enviar notificación a cada dispositivo individualmente
        for dispositivo in dispositivos:
            try:
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=titulo,
                        body=cuerpo
                    ),
                    token=dispositivo.fcm_token,
                    data=datos or {}
                )
                messaging.send(message)
                success_count += 1
                print(f"✅ Notificación enviada a dispositivo {dispositivo.id} (token: {dispositivo.fcm_token[:20]}...)")
            except Exception as e:
                failure_count += 1
                print(f"❌ Error enviando a dispositivo {dispositivo.id}: {e}")
                # Si el token es inválido, desactivar el dispositivo
                if "NotRegistered" in str(e) or "InvalidRegistration" in str(e):
                    dispositivo.activo = False
                    db.commit()
                    print(f"   Dispositivo {dispositivo.id} desactivado por token inválido")
        
        print(f"✅ Notificación push: {success_count} exitosos, {failure_count} fallidos")
        print(f"   Título: {titulo}")
        
        return {
            "success": success_count > 0,
            "success_count": success_count,
            "failure_count": failure_count
        }
    except Exception as e:
        print(f"❌ Error enviando notificación push: {e}")
        return {"success": False, "error": str(e)}
    finally:
        db.close()