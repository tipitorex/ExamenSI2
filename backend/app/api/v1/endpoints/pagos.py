from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_db, obtener_taller_actual, obtener_cliente_actual
from app.models.taller import Taller
from app.models.cliente import Cliente
from app.models.factura import Factura
from app.schemas.pago import (
    FacturaCrear,
    FacturaRespuesta,
    FacturaDetalleRespuesta,
    FacturaListaRespuesta,
    IniciarPagoRequest,
    IniciarPagoResponse,
    VerificarPagoResponse,
)
from app.services.pago_servicio import (
    crear_factura,
    obtener_factura,
    obtener_factura_por_incidente,
    obtener_facturas_por_taller,
    obtener_facturas_por_cliente,
    iniciar_pago_stripe,
    procesar_webhook_stripe,
    verificar_y_actualizar_pago,
)
from app.core.settings import settings
from app.models.pago import Pago

router = APIRouter()


# ========== FACTURAS ==========

@router.post("/facturas", response_model=FacturaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_factura_endpoint(
    payload: FacturaCrear,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Taller crea factura para un incidente atendido.
    La factura incluye la lista de conceptos (servicios/productos).
    """
    try:
        factura = crear_factura(db, taller_actual.id, payload)
        return factura
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/facturas/taller", response_model=List[FacturaDetalleRespuesta])  # ✅ CAMBIADO a FacturaDetalleRespuesta
def listar_facturas_taller(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """Lista todas las facturas emitidas por el taller con conceptos, cliente y taller"""
    facturas = db.query(Factura).options(
        selectinload(Factura.conceptos),
        selectinload(Factura.cliente),   # ✅ Agregado
        selectinload(Factura.taller)     # ✅ Agregado
    ).filter(
        Factura.taller_id == taller_actual.id
    ).order_by(
        Factura.creado_en.desc()
    ).offset(skip).limit(limit).all()
    
    return facturas


@router.get("/facturas/cliente", response_model=List[FacturaDetalleRespuesta])
def listar_facturas_cliente(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Lista todas las facturas del cliente con sus conceptos, cliente y taller"""
    facturas = db.query(Factura).options(
        selectinload(Factura.conceptos),
        selectinload(Factura.cliente),
        selectinload(Factura.taller)
    ).filter(
        Factura.cliente_id == cliente_actual.id
    ).order_by(
        Factura.creado_en.desc()
    ).offset(skip).limit(limit).all()
    
    return facturas


@router.get("/facturas/incidente/{incidente_id}", response_model=FacturaDetalleRespuesta)
def obtener_factura_por_incidente_endpoint(
    incidente_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Cliente obtiene la factura de su incidente con conceptos, cliente y taller"""
    factura = db.query(Factura).options(
        selectinload(Factura.conceptos),
        selectinload(Factura.cliente),
        selectinload(Factura.taller)
    ).filter(
        Factura.incidente_id == incidente_id,
        Factura.cliente_id == cliente_actual.id
    ).first()
    
    if not factura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No hay factura para este incidente"
        )
    
    return factura


# ========== NUEVO ENDPOINT PARA TALLER (EVITA EL 401) ==========

@router.get("/facturas-taller/{factura_id}", response_model=FacturaDetalleRespuesta)
def obtener_factura_detalle_taller(
    factura_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """Obtiene detalle de factura para taller (endpoint específico)"""
    from sqlalchemy.orm import selectinload
    
    factura = db.query(Factura).options(
        selectinload(Factura.conceptos),
        selectinload(Factura.cliente),
        selectinload(Factura.taller)
    ).filter(
        Factura.id == factura_id, 
        Factura.taller_id == taller_actual.id
    ).first()
    
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    return factura


@router.get("/facturas/{factura_id}", response_model=FacturaDetalleRespuesta)
def obtener_factura_detalle(
    factura_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """Obtiene detalle completo de una factura con conceptos, cliente y taller"""
    factura = None
    
    if taller_actual:
        factura = db.query(Factura).options(
            selectinload(Factura.conceptos),
            selectinload(Factura.cliente),
            selectinload(Factura.taller)
        ).filter(
            Factura.id == factura_id, 
            Factura.taller_id == taller_actual.id
        ).first()
    
    if cliente_actual and not factura:
        factura = db.query(Factura).options(
            selectinload(Factura.conceptos),
            selectinload(Factura.cliente),
            selectinload(Factura.taller)
        ).filter(
            Factura.id == factura_id, 
            Factura.cliente_id == cliente_actual.id
        ).first()
    
    if not factura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Factura no encontrada"
        )
    
    return factura


# ========== PAGOS CON STRIPE (PAYMENT INTENT) ==========

@router.post("/iniciar", response_model=IniciarPagoResponse)
def iniciar_pago(
    payload: IniciarPagoRequest,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """
    Cliente inicia el pago de una factura pendiente.
    Crea un PaymentIntent de Stripe y devuelve el client_secret para Flutter.
    """
    factura = db.query(Factura).filter(
        Factura.id == payload.factura_id,
        Factura.cliente_id == cliente_actual.id
    ).first()
    
    if not factura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Factura no encontrada"
        )
    
    if factura.estado != "pendiente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"La factura ya está {factura.estado}"
        )
    
    try:
        resultado = iniciar_pago_stripe(
            db,
            payload.factura_id,
            payload.success_url,
            payload.cancel_url
        )
        return IniciarPagoResponse(
            payment_intent_client_secret=resultado["payment_intent_client_secret"],
            factura_id=resultado["factura_id"],
            pago_id=resultado["pago_id"]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/webhook")
async def webhook_stripe(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Webhook de Stripe para confirmar pagos.
    Stripe llama a este endpoint automáticamente cuando se completa un pago.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    
    try:
        resultado = procesar_webhook_stripe(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET,
            db
        )
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ========== VERIFICAR PAGO (CONSULTA A STRIPE) ==========

@router.get("/verificar/{factura_id}", response_model=VerificarPagoResponse)
def verificar_pago(
    factura_id: int,
    db: Session = Depends(get_db),
    cliente_actual: Cliente = Depends(obtener_cliente_actual),
):
    """
    Verifica si una factura ya fue pagada.
    Si está pendiente, consulta a Stripe para actualizar el estado.
    """
    factura = db.query(Factura).options(
        selectinload(Factura.cliente),
        selectinload(Factura.taller)
    ).filter(
        Factura.id == factura_id,
        Factura.cliente_id == cliente_actual.id
    ).first()
    
    if not factura:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Factura no encontrada"
        )
    
    if factura.estado == "pendiente":
        pago = db.query(Pago).filter(Pago.factura_id == factura_id).first()
        if pago and pago.stripe_payment_intent_id:
            factura_actualizada = verificar_y_actualizar_pago(db, factura_id, pago.stripe_payment_intent_id)
            if factura_actualizada:
                factura = factura_actualizada
    
    return VerificarPagoResponse(
        pagado=(factura.estado == "pagada"),
        factura_id=factura.id,
        estado=factura.estado,
        mensaje="Pagada" if factura.estado == "pagada" else "Pendiente de pago"
    )