from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import traceback

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.models.plan_suscripcion import PlanSuscripcion
from app.models.pago_suscripcion import PagoSuscripcion
from app.core.stripe_config import stripe
from app.core.settings import settings

router = APIRouter()


# ============================================================
# SCHEMAS
# ============================================================

class CrearCheckoutRequest(BaseModel):
    plan_id: int
    success_url: str
    cancel_url: str


class CrearCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class VerificarPagoRequest(BaseModel):
    session_id: str


class VerificarPagoResponse(BaseModel):
    pagado: bool
    suscripcion_activa_hasta: Optional[str] = None
    mensaje: str


# ============================================================
# ENDPOINT: OBTENER PLAN ACTUAL DEL TALLER
# ============================================================

@router.get("/mi-plan")
def obtener_mi_plan(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Obtiene la información del plan actual del taller.
    """
    plan = None
    if taller_actual.plan_id:
        plan = db.query(PlanSuscripcion).filter(PlanSuscripcion.id == taller_actual.plan_id).first()
    
    tecnicos_actuales = db.query(Tecnico).filter(
        Tecnico.taller_id == taller_actual.id,
        Tecnico.activo == True
    ).count()
    
    if plan:
        limite_tecnicos = plan.limite_tecnicos
        limite_incidentes = plan.limite_incidentes_mensual
    else:
        limite_tecnicos = 2
        limite_incidentes = 10
    
    suscripcion_activa = False
    if taller_actual.suscripcion_activa_hasta:
        suscripcion_activa = taller_actual.suscripcion_activa_hasta > datetime.now(timezone.utc)
    
    return {
        "plan": {
            "id": plan.id,
            "nombre": plan.nombre,
            "descripcion": plan.descripcion,
            "precio_mensual": float(plan.precio_mensual),
            "precio_anual": float(plan.precio_anual),
            "limite_tecnicos": plan.limite_tecnicos,
            "limite_incidentes_mensual": plan.limite_incidentes_mensual,
            "caracteristicas": plan.caracteristicas,
        } if plan else None,
        "suscripcion_activa": suscripcion_activa,
        "suscripcion_activa_hasta": taller_actual.suscripcion_activa_hasta.isoformat() if taller_actual.suscripcion_activa_hasta else None,
        "limite_tecnicos": limite_tecnicos,
        "tecnicos_actuales": tecnicos_actuales,
        "limite_incidentes_mensual": limite_incidentes,
        "incidentes_mes_actual": taller_actual.incidentes_mes_actual or 0,
        "puede_agregar_tecnico": tecnicos_actuales < limite_tecnicos,
        "puede_reportar_incidente": (taller_actual.incidentes_mes_actual or 0) < limite_incidentes,
    }


# ============================================================
# ENDPOINT: CREAR CHECKOUT SESSION
# ============================================================

@router.post("/crear-checkout", response_model=CrearCheckoutResponse)
def crear_checkout_session(
    payload: CrearCheckoutRequest,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Crea una sesión de Stripe Checkout para que el taller actualice su plan.
    """
    plan = db.query(PlanSuscripcion).filter(PlanSuscripcion.id == payload.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    if plan.precio_mensual <= 0:
        raise HTTPException(status_code=400, detail="Plan no válido para upgrade")
    precio = int(plan.precio_mensual * 100)  # centavos BOB
    
    if taller_actual.plan_id == plan.id and taller_actual.suscripcion_activa_hasta and taller_actual.suscripcion_activa_hasta > datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Ya tienes el plan Premium activo")
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "bob",
                        "product_data": {
                            "name": f"Plan {plan.nombre} - CeroEspera",
                            "description": f"Suscripción {plan.nombre} para taller {taller_actual.nombre}",
                        },
                        "unit_amount": precio,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
            metadata={
                "taller_id": str(taller_actual.id),
                "plan_id": str(plan.id),
                "plan_nombre": plan.nombre,
            },
            client_reference_id=str(taller_actual.id),
        )
        
        return CrearCheckoutResponse(
            checkout_url=checkout_session.url,
            session_id=checkout_session.id
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creando checkout: {str(e)}")


# ============================================================
# ENDPOINT: VERIFICAR PAGO (CORREGIDO - SIN ERROR DE METADATA)
# ============================================================

@router.post("/verificar-pago", response_model=VerificarPagoResponse)
def verificar_pago(
    payload: VerificarPagoRequest,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Verifica si el pago fue exitoso y actualiza la suscripción del taller.
    """
    print(f"\n{'='*50}")
    print(f"✅ VERIFICANDO PAGO - Taller ID: {taller_actual.id}")
    print(f"✅ Session ID: {payload.session_id}")
    print(f"{'='*50}")
    
    try:
        # Verificar que stripe está disponible
        if stripe is None:
            print("❌ Stripe no está configurado")
            return VerificarPagoResponse(
                pagado=False,
                mensaje="Error: Stripe no está configurado en el servidor"
            )
        
        print(f"🔍 Stripe configurado correctamente")
        
        # Obtener la sesión
        checkout_session = stripe.checkout.Session.retrieve(payload.session_id)
        
        print(f"📡 Payment status: {checkout_session.payment_status}")
        print(f"📡 Client reference ID: {checkout_session.client_reference_id}")
        print(f"📡 Amount total: {checkout_session.amount_total}")
        
        if checkout_session.client_reference_id != str(taller_actual.id):
            print(f"❌ Sesión no pertenece al taller")
            return VerificarPagoResponse(
                pagado=False,
                mensaje="Esta sesión no pertenece a tu taller"
            )
        
        if checkout_session.payment_status == "paid":
            # ✅ CORREGIDO: Acceder a metadata correctamente (usar get con diccionario o acceso directo)
            try:
                # Forma correcta de acceder a metadata en Stripe
                if hasattr(checkout_session, 'metadata') and checkout_session.metadata:
                    plan_id = int(checkout_session.metadata.get("plan_id", "2"))
                else:
                    plan_id = 2
            except (AttributeError, KeyError, TypeError):
                plan_id = 2
            
            monto_pagado = checkout_session.amount_total / 100
            
            print(f"✅ Pago exitoso! Monto: ${monto_pagado}")
            print(f"📋 Plan ID: {plan_id}")
            
            ahora = datetime.now(timezone.utc)
            nueva_fecha = ahora + timedelta(days=30)
            
            taller_actual.plan_id = plan_id
            taller_actual.suscripcion_activa_hasta = nueva_fecha
            taller_actual.incidentes_mes_actual = 0
            taller_actual.ultimo_reset_incidentes = ahora
            
            pago_suscripcion = PagoSuscripcion(
                taller_id=taller_actual.id,
                monto=monto_pagado,
                plan_id=plan_id,
                periodo="mensual",
                stripe_payment_intent_id=getattr(checkout_session, 'payment_intent', None),
                stripe_subscription_id=checkout_session.id,
                estado="completado",
                fecha_vencimiento=nueva_fecha,
                datos_extra={
                    "checkout_session_id": checkout_session.id,
                    "payment_status": checkout_session.payment_status
                }
            )
            db.add(pago_suscripcion)
            db.commit()
            db.refresh(taller_actual)
            
            print(f"✅ SUSCRIPCIÓN ACTIVADA hasta: {nueva_fecha}")
            print(f"{'='*50}\n")
            
            return VerificarPagoResponse(
                pagado=True,
                suscripcion_activa_hasta=nueva_fecha.isoformat(),
                mensaje=f"¡Pago exitoso! Bs. {monto_pagado:.2f} BOB. Suscripción Premium activa por 30 días."
            )
        else:
            print(f"⚠️ Pago no completado. Estado: {checkout_session.payment_status}")
            return VerificarPagoResponse(
                pagado=False,
                mensaje=f"El pago no ha sido completado. Estado: {checkout_session.payment_status}"
            )
            
    except Exception as e:
        error_detalle = traceback.format_exc()
        print(f"❌ ERROR DETALLADO: {error_detalle}")
        return VerificarPagoResponse(
            pagado=False,
            mensaje=f"Error: {str(e)} - {type(e).__name__}"
        )