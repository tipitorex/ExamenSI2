import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
import stripe

from app.models.factura import Factura, ConceptoFactura, EstadoFacturaEnum
from app.models.pago import Pago, EstadoPago
from app.models.incidente import Incidente
from app.models.asignacion_taller import AsignacionTaller
from app.core.stripe_config import stripe as stripe_client
from app.schemas.pago import FacturaCrear, ConceptoFacturaCrear

logger = logging.getLogger(__name__)


# ========== FACTURAS ==========

def generar_numero_factura(db: Session) -> str:
    """Genera número único de factura: FACT-2024-00001"""
    año = datetime.now().year
    consulta = select(Factura).where(Factura.numero_factura.like(f"FACT-{año}-%"))
    count = len(db.execute(consulta).scalars().all())
    return f"FACT-{año}-{count + 1:05d}"


def crear_factura(db: Session, taller_id: int, payload: FacturaCrear) -> Factura:
    """Taller emite factura para un incidente atendido (actualiza factura automática si existe)"""
    
    incidente = db.query(Incidente).filter(Incidente.id == payload.incidente_id).first()
    if not incidente:
        raise ValueError("Incidente no encontrado")
    
    asignacion = db.query(AsignacionTaller).filter(
        AsignacionTaller.incidente_id == payload.incidente_id,
        AsignacionTaller.taller_id == taller_id
    ).first()
    
    if not asignacion:
        raise ValueError("Este incidente no está asignado a tu taller")
    
    # 🔥 BUSCAR FACTURA EXISTENTE (creada automáticamente por crear_factura_automatica)
    factura_existente = db.query(Factura).filter(Factura.incidente_id == payload.incidente_id).first()
    
    total = sum(c.cantidad * c.precio_unitario for c in payload.conceptos)
    comision_plataforma = total * 0.10
    monto_neto_taller = total * 0.90
    
    if factura_existente:
        # ✅ Actualizar factura existente (creada automáticamente)
        factura_existente.total = total
        factura_existente.comision_plataforma = comision_plataforma
        factura_existente.monto_neto_taller = monto_neto_taller
        factura_existente.notas_internas = payload.notas_internas
        factura_existente.estado = EstadoFacturaEnum.PENDIENTE
        
        # Eliminar conceptos antiguos
        db.query(ConceptoFactura).filter(ConceptoFactura.factura_id == factura_existente.id).delete()
        
        factura = factura_existente
    else:
        # Crear nueva factura (si no existe)
        factura = Factura(
            incidente_id=payload.incidente_id,
            taller_id=taller_id,
            cliente_id=incidente.cliente_id,
            numero_factura=generar_numero_factura(db),
            total=total,
            comision_plataforma=comision_plataforma,
            monto_neto_taller=monto_neto_taller,
            notas_internas=payload.notas_internas,
            estado=EstadoFacturaEnum.PENDIENTE
        )
        db.add(factura)
        db.flush()
    
    # Agregar nuevos conceptos
    for concepto_data in payload.conceptos:
        subtotal = concepto_data.cantidad * concepto_data.precio_unitario
        concepto = ConceptoFactura(
            factura_id=factura.id,
            concepto=concepto_data.concepto,
            cantidad=concepto_data.cantidad,
            precio_unitario=concepto_data.precio_unitario,
            subtotal=subtotal
        )
        db.add(concepto)
    
    db.commit()
    db.refresh(factura)
    
    logger.info(f"✅ Factura {'actualizada' if factura_existente else 'creada'}: {factura.numero_factura} - Total: ${factura.total}")
    
    return factura


def obtener_factura(db: Session, factura_id: int, taller_id: Optional[int] = None, cliente_id: Optional[int] = None) -> Optional[Factura]:
    consulta = select(Factura).where(Factura.id == factura_id)
    
    if taller_id:
        consulta = consulta.where(Factura.taller_id == taller_id)
    if cliente_id:
        consulta = consulta.where(Factura.cliente_id == cliente_id)
    
    return db.execute(consulta).scalar_one_or_none()


def obtener_factura_por_incidente(db: Session, incidente_id: int) -> Optional[Factura]:
    consulta = select(Factura).where(Factura.incidente_id == incidente_id)
    return db.execute(consulta).scalar_one_or_none()


def obtener_facturas_por_taller(db: Session, taller_id: int, skip: int = 0, limit: int = 100) -> List[Factura]:
    consulta = select(Factura).where(Factura.taller_id == taller_id).order_by(Factura.creado_en.desc()).offset(skip).limit(limit)
    return db.execute(consulta).scalars().all()


def obtener_facturas_por_cliente(db: Session, cliente_id: int, skip: int = 0, limit: int = 100) -> List[Factura]:
    consulta = select(Factura).where(Factura.cliente_id == cliente_id).order_by(Factura.creado_en.desc()).offset(skip).limit(limit)
    return db.execute(consulta).scalars().all()


def marcar_factura_pagada(db: Session, factura_id: int, url_pago: str = None) -> Factura:
    factura = obtener_factura(db, factura_id)
    if not factura:
        raise ValueError("Factura no encontrada")
    
    factura.estado = EstadoFacturaEnum.PAGADA
    factura.pagado_en = datetime.now()
    if url_pago:
        factura.url_pago = url_pago
    
    db.commit()
    db.refresh(factura)
    
    logger.info(f"💰 Factura pagada: {factura.numero_factura}")
    
    return factura


# ========== PAGOS ==========

def registrar_pago(db: Session, factura_id: int, monto: float, metodo_pago: str, stripe_payment_intent_id: str = None) -> Pago:
    factura = db.query(Factura).filter(Factura.id == factura_id).first()
    if not factura:
        raise ValueError("Factura no encontrada")
    
    comision = monto * 0.10
    monto_taller = monto * 0.90
    
    pago = Pago(
        factura_id=factura_id,
        cliente_id=factura.cliente_id,
        incidente_id=factura.incidente_id,
        monto=monto,
        comision_plataforma=comision,
        monto_para_taller=monto_taller,
        metodo_pago=metodo_pago,
        stripe_payment_intent_id=stripe_payment_intent_id,
        estado=EstadoPago.PENDIENTE
    )
    
    db.add(pago)
    db.commit()
    db.refresh(pago)
    
    return pago


def confirmar_pago(db: Session, pago_id: int, stripe_payment_intent_id: str) -> Pago:
    pago = db.query(Pago).filter(Pago.id == pago_id).first()
    if not pago:
        raise ValueError("Pago no encontrada")
    
    pago.estado = EstadoPago.COMPLETADO
    pago.stripe_payment_intent_id = stripe_payment_intent_id
    pago.fecha_pago = datetime.now()
    pago.referencia_pago = stripe_payment_intent_id
    
    db.commit()
    db.refresh(pago)
    
    if pago.factura_id:
        marcar_factura_pagada(db, pago.factura_id)
    
    logger.info(f"💰 Pago confirmado: {pago.id} - Monto: ${pago.monto}")
    
    return pago


# ========== STRIPE CON PAYMENT INTENT ==========

def iniciar_pago_stripe(db: Session, factura_id: int, success_url: str, cancel_url: str) -> Dict[str, Any]:
    """
    Crea un PaymentIntent de Stripe para el pago.
    Esto es lo que necesita Flutter para mostrar el payment sheet.
    """
    factura = db.query(Factura).filter(Factura.id == factura_id).first()
    if not factura:
        raise ValueError("Factura no encontrada")
    
    if factura.estado != EstadoFacturaEnum.PENDIENTE:
        raise ValueError(f"La factura no está pendiente (estado: {factura.estado})")
    
    try:
        payment_intent = stripe_client.PaymentIntent.create(
            amount=int(factura.total * 100),
            currency='usd',
            metadata={
                "factura_id": str(factura.id),
                "incidente_id": str(factura.incidente_id),
                "taller_id": str(factura.taller_id),
            }
        )
        
        pago = registrar_pago(
            db, 
            factura_id, 
            factura.total, 
            "stripe",
            stripe_payment_intent_id=payment_intent.id
        )
        
        logger.info(f"💰 PaymentIntent creado: {payment_intent.id}")
        
        return {
            "payment_intent_client_secret": payment_intent.client_secret,
            "factura_id": factura.id,
            "pago_id": pago.id
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"❌ Error Stripe: {e.user_message}")
        raise ValueError(f"Error al crear pago: {e.user_message}")


def procesar_webhook_stripe(payload: bytes, sig_header: str, webhook_secret: str, db: Session) -> Dict[str, Any]:
    """Procesa webhook de Stripe para confirmar pagos"""
    
    try:
        event = stripe_client.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"❌ Error en webhook: {e}")
        raise ValueError("Webhook inválido")
    
    logger.info(f"📡 Webhook recibido: {event['type']}")
    
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        payment_intent_id = payment_intent.get('id')
        
        if payment_intent_id:
            pago = db.query(Pago).filter(Pago.stripe_payment_intent_id == payment_intent_id).first()
            
            if pago:
                try:
                    pago = confirmar_pago(db, pago.id, payment_intent_id)
                    return {"status": "success", "pago_id": pago.id, "message": "Pago confirmado"}
                except Exception as e:
                    logger.error(f"❌ Error al confirmar pago: {e}")
                    return {"status": "error", "message": str(e)}
    
    return {"status": "ignored", "message": f"Evento {event['type']} no procesado"}


def verificar_y_actualizar_pago(db: Session, factura_id: int, payment_intent_id: str) -> Optional[Factura]:
    """
    Verifica con Stripe si el pago fue exitoso y actualiza la factura.
    """
    try:
        payment_intent = stripe_client.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded':
            factura = db.query(Factura).filter(Factura.id == factura_id).first()
            if factura and factura.estado != EstadoFacturaEnum.PAGADA:
                factura.estado = EstadoFacturaEnum.PAGADA
                factura.pagado_en = datetime.now()
                
                pago = db.query(Pago).filter(Pago.stripe_payment_intent_id == payment_intent_id).first()
                if pago:
                    pago.estado = EstadoPago.COMPLETADO
                    pago.fecha_pago = datetime.now()
                
                db.commit()
                logger.info(f"💰 Factura {factura.numero_factura} actualizada a PAGADA")
                return factura
        else:
            logger.info(f"⏳ PaymentIntent {payment_intent_id} estado: {payment_intent.status}")
            
    except stripe.error.StripeError as e:
        logger.error(f"❌ Error consultando Stripe: {e.user_message}")
    except Exception as e:
        logger.error(f"❌ Error inesperado: {e}")
    
    return None


# ============================================================
# FACTURA AUTOMÁTICA AL FINALIZAR INCIDENTE
# ============================================================

def crear_factura_automatica(db: Session, incidente_id: int, taller_id: int) -> Optional[Factura]:
    """
    Crea una factura pendiente automáticamente cuando un incidente es finalizado.
    """
    # Verificar si ya existe factura
    factura_existente = db.query(Factura).filter(Factura.incidente_id == incidente_id).first()
    if factura_existente:
        logger.info(f"📄 Factura ya existe para incidente {incidente_id}")
        return factura_existente
    
    # Obtener incidente
    incidente = db.query(Incidente).filter(Incidente.id == incidente_id).first()
    if not incidente:
        logger.error(f"❌ Incidente {incidente_id} no encontrado")
        return None
    
    # Crear factura sin conceptos (pendiente)
    try:
        factura = Factura(
            incidente_id=incidente_id,
            taller_id=taller_id,
            cliente_id=incidente.cliente_id,
            numero_factura=generar_numero_factura(db),
            total=0,
            comision_plataforma=0,
            monto_neto_taller=0,
            estado=EstadoFacturaEnum.PENDIENTE,
            notas_internas=f"Factura automática por incidente #{incidente_id}"
        )
        
        db.add(factura)
        db.commit()
        db.refresh(factura)
        
        logger.info(f"✅ Factura automática creada: {factura.numero_factura} para incidente {incidente_id}")
        
        from app.services.notificacion_servicio import crear_notificacion
        from app.schemas.notificacion import NotificacionCrear, TipoNotificacionEnum
        
        notificacion = NotificacionCrear(
            taller_id=taller_id,
            incidente_id=incidente_id,
            tipo=TipoNotificacionEnum.NUEVA_SOLICITUD,
            titulo="📄 Incidente finalizado - Pendiente de facturación",
            mensaje=f"El incidente #{incidente_id} ha sido finalizado. Por favor, genera la factura para cobrar el servicio.",
        )
        crear_notificacion(db, notificacion)
        
        return factura
        
    except Exception as e:
        logger.error(f"❌ Error creando factura automática: {e}")
        db.rollback()
        return None