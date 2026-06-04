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
    
    Parámetros query:
    - token: JWT de autenticación
    - incidente_id: ID del incidente (opcional)
    - taller_id: ID del taller (opcional)
    - cliente_id: ID del cliente (opcional)
    
    Tipos de usuario soportados:
    - cliente
    - taller
    - tecnico
    """
    # Verificar token
    payload = verificar_token_websocket(token, db)
    if payload is None:
        await websocket.close(code=1008, reason="Token inválido")
        return
    
    user_id = payload.get("sub")
    user_type = payload.get("tipo")  # "cliente", "taller" o "tecnico"
    
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
        # Para técnico, permitir conexión con incidente_id
        if incidente_id is None:
            await websocket.close(code=1008, reason="Técnico necesita incidente_id")
            return
        # No asignamos taller_id ni cliente_id aquí, solo incidente_id
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
            message = json.loads(data)
            
            # Procesar según tipo de mensaje
            msg_type = message.get("tipo")
            
            if msg_type == "actualizar_ubicacion":
                # El técnico envía su ubicación actual
                latitud = message.get("data", {}).get("latitud")
                longitud = message.get("data", {}).get("longitud")
                
                if latitud and longitud and incidente_id:
                    from app.models.incidente import Incidente
                    from app.models.asignacion_taller import AsignacionTaller
                    
                    incidente = db.query(Incidente).filter(Incidente.id == incidente_id).first()
                    if incidente:
                        asignacion = db.query(AsignacionTaller).filter(
                            AsignacionTaller.incidente_id == incidente_id
                        ).first()
                        
                        tecnico_nombre = "Técnico"
                        if asignacion and asignacion.tecnico:
                            tecnico_nombre = asignacion.tecnico.nombre_completo
                        
                        await manager.broadcast_ubicacion_tecnico(
                            incidente_id=incidente_id,
                            tecnico_id=int(user_id) if user_type == "tecnico" else 0,
                            tecnico_nombre=tecnico_nombre,
                            latitud=latitud,
                            longitud=longitud,
                            taller_id=asignacion.taller_id if asignacion else None,
                            cliente_id=incidente.cliente_id,
                        )
            
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"tipo": "pong"}))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"🔌 WebSocket desconectado - Tipo: {user_type}, ID: {user_id}")