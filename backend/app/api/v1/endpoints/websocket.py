import json
from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.websocket_manager import manager
from app.services.autenticacion_servicio import verificar_token_websocket


async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    incidente_id: int | None = Query(None),
    taller_id: int | None = Query(None),
    cliente_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Endpoint WebSocket para comunicación en tiempo real.
    """
    # Verificar token
    payload = verificar_token_websocket(token, db)
    if payload is None:
        await websocket.close(code=1008, reason="Token inválido")
        return
    
    user_id = payload.get("sub")
    user_type = payload.get("tipo")
    
    print(f"🔌 Conexión WebSocket - Tipo: {user_type}, ID: {user_id}, Incidente: {incidente_id}")
    
    # Validar según el tipo de usuario
    if user_type == "cliente":
        if cliente_id is not None and int(user_id) != cliente_id:
            await websocket.close(code=1008, reason="Cliente no autorizado")
            return
        cliente_id = int(user_id)
    elif user_type == "taller":
        if taller_id is not None and int(user_id) != taller_id:
            await websocket.close(code=1008, reason="Taller no autorizado")
            return
        taller_id = int(user_id)
    elif user_type == "tecnico":
        if incidente_id is None:
            await websocket.close(code=1008, reason="Técnico necesita incidente_id")
            return
    else:
        await websocket.close(code=1008, reason="Tipo de usuario no válido")
        return
    
    # Aceptar conexión y registrar
    await manager.connect(
        websocket,
        incidente_id=incidente_id,
        taller_id=taller_id,
        cliente_id=cliente_id,
    )
    
    try:
        # Enviar confirmación de conexión
        await websocket.send_text(json.dumps({
            "tipo": "conexion_establecida",
            "data": {
                "incidente_id": incidente_id,
                "taller_id": taller_id,
                "cliente_id": cliente_id,
                "user_type": user_type,
            }
        }))
        
        # Escuchar mensajes entrantes
        while True:
            data = await websocket.receive_text()
            print(f"📨 [RAW] Mensaje recibido: {data[:200]}...")  # Log del mensaje crudo
            
            try:
                message = json.loads(data)
            except json.JSONDecodeError as e:
                print(f"❌ Error parseando JSON: {e}")
                continue
            
            msg_type = message.get("tipo")
            print(f"📨 [RAW] Tipo: {msg_type}")
            
            if msg_type == "actualizar_ubicacion":
                latitud = message.get("data", {}).get("latitud")
                longitud = message.get("data", {}).get("longitud")
                
                print(f"📍 [DEBUG] Ubicación recibida - Incidente: {incidente_id}, Lat: {latitud}, Lng: {longitud}")
                
                if latitud and longitud and incidente_id:
                    from app.models.incidente import Incidente
                    from app.models.asignacion_taller import AsignacionTaller
                    
                    incidente = db.query(Incidente).filter(Incidente.id == incidente_id).first()
                    if incidente:
                        asignacion = db.query(AsignacionTaller).filter(
                            AsignacionTaller.incidente_id == incidente_id
                        ).first()
                        
                        print(f"📍 [DEBUG] Incidente encontrado: {incidente.id}")
                        print(f"📍 [DEBUG] Asignación encontrada: {asignacion.id if asignacion else 'None'}")
                        print(f"📍 [DEBUG] taller_id: {asignacion.taller_id if asignacion else 'None'}")
                        print(f"📍 [DEBUG] cliente_id: {incidente.cliente_id}")
                        
                        tecnico_nombre = "Técnico"
                        if asignacion and asignacion.tecnico:
                            tecnico_nombre = asignacion.tecnico.nombre_completo
                        
                        print(f"📍 [DEBUG] Broadcast a taller_id: {asignacion.taller_id if asignacion else 'None'}")
                        
                        await manager.broadcast_ubicacion_tecnico(
                            incidente_id=incidente_id,
                            tecnico_id=int(user_id) if user_type == "tecnico" else 0,
                            tecnico_nombre=tecnico_nombre,
                            latitud=latitud,
                            longitud=longitud,
                            taller_id=asignacion.taller_id if asignacion else None,
                            cliente_id=incidente.cliente_id,
                        )
                        print(f"📍 [DEBUG] Broadcast completado")
                    else:
                        print(f"❌ [DEBUG] Incidente {incidente_id} no encontrado")
            
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"tipo": "pong"}))
            else:
                print(f"⚠️ Tipo de mensaje no reconocido: {msg_type}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"🔌 WebSocket desconectado - Tipo: {user_type}, ID: {user_id}")
    except Exception as e:
        print(f"❌ Error en WebSocket: {e}")
        import traceback
        traceback.print_exc()