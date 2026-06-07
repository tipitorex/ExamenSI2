import json
import logging
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestor de conexiones WebSocket.
    Maneja rooms por incidente, taller y cliente.
    """
    
    def __init__(self):
        # Conexiones activas: {incidente_id: {websocket, ...}}
        self.incident_connections: Dict[int, Set[WebSocket]] = {}
        # Conexiones por taller: {taller_id: {websocket, ...}}
        self.taller_connections: Dict[int, Set[WebSocket]] = {}
        # Conexiones por cliente: {cliente_id: {websocket, ...}}
        self.cliente_connections: Dict[int, Set[WebSocket]] = {}
        # Mapeo websocket -> metadata
        self._websocket_metadata: Dict[WebSocket, Dict[str, Optional[int]]] = {}
    
    async def connect(
        self,
        websocket: WebSocket,
        incidente_id: Optional[int] = None,
        taller_id: Optional[int] = None,
        cliente_id: Optional[int] = None,
    ) -> None:
        """Acepta conexión y la registra en las rooms correspondientes"""
        await websocket.accept()
        
        # Registrar metadata
        self._websocket_metadata[websocket] = {
            "incidente_id": incidente_id,
            "taller_id": taller_id,
            "cliente_id": cliente_id,
        }
        
        # Registrar en incident_connections
        if incidente_id is not None:
            if incidente_id not in self.incident_connections:
                self.incident_connections[incidente_id] = set()
            self.incident_connections[incidente_id].add(websocket)
            logger.info(f"🔌 WebSocket conectado a incidente {incidente_id}")
        
        # Registrar en taller_connections
        if taller_id is not None:
            if taller_id not in self.taller_connections:
                self.taller_connections[taller_id] = set()
            self.taller_connections[taller_id].add(websocket)
            logger.info(f"🔌 WebSocket conectado a taller {taller_id}")
        
        # Registrar en cliente_connections
        if cliente_id is not None:
            if cliente_id not in self.cliente_connections:
                self.cliente_connections[cliente_id] = set()
            self.cliente_connections[cliente_id].add(websocket)
            logger.info(f"🔌 WebSocket conectado a cliente {cliente_id}")
    
    def disconnect(self, websocket: WebSocket) -> None:
        """Elimina una conexión WebSocket de todas las rooms"""
        metadata = self._websocket_metadata.pop(websocket, {})
        
        incidente_id = metadata.get("incidente_id")
        taller_id = metadata.get("taller_id")
        cliente_id = metadata.get("cliente_id")
        
        if incidente_id and incidente_id in self.incident_connections:
            self.incident_connections[incidente_id].discard(websocket)
            if not self.incident_connections[incidente_id]:
                del self.incident_connections[incidente_id]
        
        if taller_id and taller_id in self.taller_connections:
            self.taller_connections[taller_id].discard(websocket)
            if not self.taller_connections[taller_id]:
                del self.taller_connections[taller_id]
        
        if cliente_id and cliente_id in self.cliente_connections:
            self.cliente_connections[cliente_id].discard(websocket)
            if not self.cliente_connections[cliente_id]:
                del self.cliente_connections[cliente_id]
        
        logger.info(f"🔌 WebSocket desconectado")
    
    async def send_to_incident(self, incidente_id: int, data: Dict[str, Any]) -> int:
        """Envía mensaje a todos los clientes conectados al incidente"""
        sent_count = 0
        if incidente_id in self.incident_connections:
            # ✅ Crear copia para evitar error de modificación durante iteración
            connections = list(self.incident_connections[incidente_id])
            message = json.dumps(data)
            for websocket in connections:
                try:
                    await websocket.send_text(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Error enviando a incidente {incidente_id}: {e}")
                    # Si hay error, desconectar automáticamente
                    self.disconnect(websocket)
        return sent_count
    
    async def send_to_taller(self, taller_id: int, data: Dict[str, Any]) -> int:
        """Envía mensaje a todos los clientes conectados al taller"""
        sent_count = 0
        if taller_id in self.taller_connections:
            # ✅ Crear copia para evitar error de modificación durante iteración
            connections = list(self.taller_connections[taller_id])
            message = json.dumps(data)
            for websocket in connections:
                try:
                    await websocket.send_text(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Error enviando a taller {taller_id}: {e}")
                    self.disconnect(websocket)
        return sent_count
    
    async def send_to_cliente(self, cliente_id: int, data: Dict[str, Any]) -> int:
        """Envía mensaje a todos los clientes conectados del cliente"""
        sent_count = 0
        if cliente_id in self.cliente_connections:
            # ✅ Crear copia para evitar error de modificación durante iteración
            connections = list(self.cliente_connections[cliente_id])
            message = json.dumps(data)
            for websocket in connections:
                try:
                    await websocket.send_text(message)
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Error enviando a cliente {cliente_id}: {e}")
                    self.disconnect(websocket)
        return sent_count
    
    async def broadcast_estado_incidente(
        self,
        incidente_id: int,
        estado: str,
        taller_id: Optional[int] = None,
        cliente_id: Optional[int] = None,
        data_extra: Optional[Dict] = None,
    ) -> None:
        """Envía actualización de estado a todos los interesados"""
        message = {
            "tipo": "estado_incidente",
            "data": {
                "incidente_id": incidente_id,
                "estado": estado,
                **(data_extra or {}),
            }
        }
        
        await self.send_to_incident(incidente_id, message)
        
        if taller_id:
            await self.send_to_taller(taller_id, message)
        
        if cliente_id:
            await self.send_to_cliente(cliente_id, message)
    
    async def broadcast_ubicacion_tecnico(
        self,
        incidente_id: int,
        tecnico_id: int,
        tecnico_nombre: str,
        latitud: float,
        longitud: float,
        taller_id: Optional[int] = None,
        cliente_id: Optional[int] = None,
    ) -> None:
        """Envía actualización de ubicación del técnico"""
        import datetime
        message = {
            "tipo": "ubicacion_tecnico",
            "data": {
                "incidente_id": incidente_id,
                "tecnico_id": tecnico_id,
                "tecnico_nombre": tecnico_nombre,
                "latitud": latitud,
                "longitud": longitud,
                "timestamp": datetime.datetime.now().isoformat(),
            }
        }
        
        await self.send_to_incident(incidente_id, message)
        if taller_id:
            await self.send_to_taller(taller_id, message)
        if cliente_id:
            await self.send_to_cliente(cliente_id, message)


# Instancia global
manager = ConnectionManager()