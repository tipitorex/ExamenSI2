from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.api.deps import get_db, obtener_super_admin_actual
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.models.incidente import Incidente
from app.models.cliente import Cliente
from app.models.plan_suscripcion import PlanSuscripcion
from app.models.pago_suscripcion import PagoSuscripcion

router = APIRouter()


# ============================================================
# DASHBOARD - MÉTRICAS GLOBALES
# ============================================================

@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Dashboard principal del Super Admin"""
    
    total_talleres = db.query(Taller).count()
    total_tecnicos = db.query(Tecnico).count()
    total_incidentes = db.query(Incidente).count()
    total_clientes = db.query(Cliente).count()
    
    ingresos_totales = db.query(func.sum(PagoSuscripcion.monto)).filter(
        PagoSuscripcion.estado == 'completado'
    ).scalar() or 0
    
    # Talleres por plan
    talleres_gratuito = db.query(Taller).filter(Taller.plan_id == 1).count()
    talleres_premium = db.query(Taller).filter(Taller.plan_id == 2).count()
    
    return {
        "totales": {
            "talleres": total_talleres,
            "tecnicos": total_tecnicos,
            "incidentes": total_incidentes,
            "clientes": total_clientes,
            "ingresos_totales_usd": float(ingresos_totales)
        },
        "talleres_por_plan": {
            "gratuito": talleres_gratuito,
            "premium": talleres_premium
        }
    }


# ============================================================
# CRUD DE TALLERES
# ============================================================

@router.get("/talleres")
def listar_talleres_admin(
    skip: int = 0,
    limit: int = 50,
    busqueda: Optional[str] = None,
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Lista todos los talleres"""
    
    query = db.query(Taller)
    
    if busqueda:
        query = query.filter(
            Taller.nombre.ilike(f"%{busqueda}%") | 
            Taller.email.ilike(f"%{busqueda}%")
        )
    
    total = query.count()
    talleres = query.order_by(Taller.id.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "talleres": [
            {
                "id": t.id,
                "nombre": t.nombre,
                "email": t.email,
                "telefono": t.telefono,
                "plan_id": t.plan_id,
                "plan_nombre": t.plan.nombre if t.plan else "Sin plan",
                "suscripcion_activa_hasta": t.suscripcion_activa_hasta.isoformat() if t.suscripcion_activa_hasta else None,
                "activo": t.activo,
                "creado_en": t.creado_en.isoformat()
            }
            for t in talleres
        ]
    }


@router.get("/talleres/{taller_id}")
def obtener_taller_admin(
    taller_id: int,
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Obtiene detalles de un taller específico"""
    
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if not taller:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    
    # Contar técnicos del taller
    tecnicos_count = db.query(Tecnico).filter(Tecnico.taller_id == taller_id).count()
    
    return {
        "id": taller.id,
        "nombre": taller.nombre,
        "email": taller.email,
        "telefono": taller.telefono,
        "direccion": taller.direccion,
        "latitud": taller.latitud,
        "longitud": taller.longitud,
        "plan_id": taller.plan_id,
        "plan_nombre": taller.plan.nombre if taller.plan else "Sin plan",
        "suscripcion_activa_hasta": taller.suscripcion_activa_hasta.isoformat() if taller.suscripcion_activa_hasta else None,
        "tecnicos_count": tecnicos_count,
        "activo": taller.activo,
        "creado_en": taller.creado_en.isoformat()
    }


@router.put("/talleres/{taller_id}/plan")
def actualizar_plan_taller_admin(
    taller_id: int,
    plan_id: int,
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Actualiza el plan de suscripción de un taller"""
    
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if not taller:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    
    plan = db.query(PlanSuscripcion).filter(PlanSuscripcion.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    
    taller.plan_id = plan_id
    db.commit()
    
    return {"success": True, "mensaje": f"Plan actualizado a {plan.nombre}"}


@router.put("/talleres/{taller_id}/estado")
def cambiar_estado_taller_admin(
    taller_id: int,
    activo: bool,
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Activa o desactiva un taller"""
    
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if not taller:
        raise HTTPException(status_code=404, detail="Taller no encontrado")
    
    taller.activo = activo
    db.commit()
    
    return {"success": True, "mensaje": f"Taller {'activado' if activo else 'desactivado'}"}


# ============================================================
# GESTIÓN DE PLANES
# ============================================================

@router.get("/planes")
def listar_planes_admin(
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Lista todos los planes de suscripción"""
    
    planes = db.query(PlanSuscripcion).all()
    
    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "precio_mensual": float(p.precio_mensual),
            "precio_anual": float(p.precio_anual),
            "limite_tecnicos": p.limite_tecnicos,
            "limite_incidentes_mensual": p.limite_incidentes_mensual,
            "activo": p.activo
        }
        for p in planes
    ]


# ============================================================
# PAGOS
# ============================================================

@router.get("/pagos")
def listar_pagos_admin(
    skip: int = 0,
    limit: int = 50,
    taller_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """Lista todos los pagos de suscripciones"""
    
    query = db.query(PagoSuscripcion)
    
    if taller_id:
        query = query.filter(PagoSuscripcion.taller_id == taller_id)
    
    total = query.count()
    pagos = query.order_by(PagoSuscripcion.fecha_creacion.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "pagos": [
            {
                "id": p.id,
                "taller_id": p.taller_id,
                "taller_nombre": p.taller.nombre if p.taller else "N/A",
                "monto": float(p.monto),
                "fecha": p.fecha_creacion.isoformat(),
                "estado": p.estado,
                "plan_id": p.plan_id,
                "plan_nombre": p.plan.nombre if p.plan else "N/A"
            }
            for p in pagos
        ]
    }