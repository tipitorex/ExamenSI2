import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, obtener_cliente_actual, obtener_taller_actual
from app.models.cliente import Cliente
from app.models.cotizacion_vehiculo import CotizacionVehiculo
from app.models.taller import Taller
from app.schemas.cotizacion_vehiculo import CotizacionVehiculoOut, CotizacionVehiculoResponder
from app.services.notificacion_servicio import enviar_notificacion_push_a_taller, enviar_push_a_cliente

router = APIRouter()

MEDIA_DIR = "media/cotizaciones_vehiculo"
os.makedirs(MEDIA_DIR, exist_ok=True)


def _guardar_imagen(imagen: UploadFile) -> str | None:
    if not imagen or not imagen.filename:
        return None
    ext = os.path.splitext(imagen.filename)[1]
    nombre = f"{uuid.uuid4().hex}{ext}"
    ruta = os.path.join(MEDIA_DIR, nombre)
    try:
        contenido = imagen.file.read()
        with open(ruta, "wb") as f:
            f.write(contenido)
    except Exception as e:
        print(f"Error guardando imagen cotizacion_vehiculo: {e}")
        return None
    return ruta


def _load(db: Session, solicitud_id: int) -> CotizacionVehiculo:
    sol = db.query(CotizacionVehiculo).options(
        joinedload(CotizacionVehiculo.taller),
        joinedload(CotizacionVehiculo.cliente),
    ).filter(CotizacionVehiculo.id == solicitud_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    return sol


# ──────────────────────────────────────────────────────────────
# CLIENTE: crear solicitud
# ──────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=CotizacionVehiculoOut)
async def crear_solicitud(
    taller_id: int = Form(...),
    descripcion: str = Form(..., min_length=10),
    imagen: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Cliente solicita cotización a un taller específico, con foto opcional del vehículo."""
    taller = db.get(Taller, taller_id)
    if not taller or not taller.activo:
        raise HTTPException(status_code=404, detail="Taller no encontrado")

    imagen_url = _guardar_imagen(imagen)

    solicitud = CotizacionVehiculo(
        cliente_id=cliente_actual.id,
        taller_id=taller_id,
        descripcion=descripcion,
        imagen_url=imagen_url,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)

    enviar_notificacion_push_a_taller(
        taller_id=taller_id,
        titulo="🔧 Nueva Cotización de Vehículo",
        cuerpo=f"{cliente_actual.nombre_completo}: {descripcion[:80]}",
        datos={"tipo": "cotizacion_vehiculo", "solicitud_id": str(solicitud.id)},
    )

    return CotizacionVehiculoOut.model_validate(_load(db, solicitud.id))


# ──────────────────────────────────────────────────────────────
# CLIENTE: ver mis solicitudes
# ──────────────────────────────────────────────────────────────

@router.get("/mis-solicitudes", response_model=list[CotizacionVehiculoOut])
def mis_solicitudes(
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    solicitudes = db.query(CotizacionVehiculo).options(
        joinedload(CotizacionVehiculo.taller),
        joinedload(CotizacionVehiculo.cliente),
    ).filter(
        CotizacionVehiculo.cliente_id == cliente_actual.id,
    ).order_by(CotizacionVehiculo.creado_en.desc()).all()
    return [CotizacionVehiculoOut.model_validate(s) for s in solicitudes]


# ──────────────────────────────────────────────────────────────
# TALLER: ver solicitudes recibidas
# ──────────────────────────────────────────────────────────────

@router.get("/taller/pendientes", response_model=list[CotizacionVehiculoOut])
def solicitudes_taller(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    solicitudes = db.query(CotizacionVehiculo).options(
        joinedload(CotizacionVehiculo.taller),
        joinedload(CotizacionVehiculo.cliente),
    ).filter(
        CotizacionVehiculo.taller_id == taller_actual.id,
    ).order_by(CotizacionVehiculo.creado_en.desc()).all()
    return [CotizacionVehiculoOut.model_validate(s) for s in solicitudes]


# ──────────────────────────────────────────────────────────────
# TALLER: responder con cotización detallada
# ──────────────────────────────────────────────────────────────

@router.post("/{solicitud_id}/responder", response_model=CotizacionVehiculoOut)
def responder_solicitud(
    solicitud_id: int,
    payload: CotizacionVehiculoResponder,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """Taller responde con desglose de ítems, monto total y tiempo estimado."""
    solicitud = _load(db, solicitud_id)
    if solicitud.taller_id != taller_actual.id:
        raise HTTPException(status_code=403, detail="No tienes permiso sobre esta solicitud")
    if solicitud.estado == "cerrada":
        raise HTTPException(status_code=400, detail="La solicitud ya está cerrada")

    items_dict = [{"nombre": i.nombre, "precio": i.precio} for i in payload.items]
    monto_total = round(sum(i.precio for i in payload.items), 2)

    solicitud.respuesta_items_json = json.dumps(items_dict)
    solicitud.respuesta_monto = monto_total
    solicitud.respuesta_descripcion = payload.descripcion
    solicitud.respuesta_tiempo_horas = payload.tiempo_horas
    solicitud.estado = "respondida"
    solicitud.respondido_en = datetime.now(timezone.utc)
    db.commit()

    enviar_push_a_cliente(
        db=db,
        cliente_id=solicitud.cliente_id,
        titulo="✅ Cotización lista",
        cuerpo=f"{taller_actual.nombre} respondió tu solicitud: Bs. {monto_total:.2f}",
        datos={"tipo": "cotizacion_vehiculo_respuesta", "solicitud_id": str(solicitud.id)},
    )

    return CotizacionVehiculoOut.model_validate(_load(db, solicitud.id))


# ──────────────────────────────────────────────────────────────
# CLIENTE: cerrar solicitud
# ──────────────────────────────────────────────────────────────

@router.post("/{solicitud_id}/cerrar", response_model=CotizacionVehiculoOut)
def cerrar_solicitud(
    solicitud_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    solicitud = _load(db, solicitud_id)
    if solicitud.cliente_id != cliente_actual.id:
        raise HTTPException(status_code=403, detail="No tienes permiso")
    solicitud.estado = "cerrada"
    db.commit()
    return CotizacionVehiculoOut.model_validate(_load(db, solicitud.id))
