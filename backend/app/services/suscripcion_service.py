from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.taller import Taller
from app.models.plan_suscripcion import PlanSuscripcion


def obtener_plan_por_id(db: Session, plan_id: int) -> PlanSuscripcion | None:
    """Obtiene un plan por su ID"""
    return db.query(PlanSuscripcion).filter(PlanSuscripcion.id == plan_id).first()


def obtener_plan_por_nombre(db: Session, nombre: str) -> PlanSuscripcion | None:
    """Obtiene un plan por su nombre"""
    return db.query(PlanSuscripcion).filter(PlanSuscripcion.nombre == nombre).first()


def obtener_plan_por_taller(db: Session, taller_id: int) -> PlanSuscripcion | None:
    """Obtiene el plan de suscripción de un taller"""
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if not taller or not taller.plan_id:
        return None
    return db.query(PlanSuscripcion).filter(PlanSuscripcion.id == taller.plan_id).first()


def verificar_limite_tecnicos(db: Session, taller_id: int) -> bool:
    """Verifica si el taller puede agregar más técnicos"""
    from app.models.tecnico import Tecnico
    
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if not taller or not taller.plan_id:
        return True
    
    plan = db.query(PlanSuscripcion).filter(PlanSuscripcion.id == taller.plan_id).first()
    if not plan:
        return True
    
    tecnicos_actuales = db.query(Tecnico).filter(
        Tecnico.taller_id == taller_id,
        Tecnico.activo == True
    ).count()
    
    return tecnicos_actuales < plan.limite_tecnicos


def verificar_limite_incidentes_mensual(db: Session, taller_id: int) -> bool:
    """Verifica si el taller ha superado el límite mensual de incidentes"""
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if not taller or not taller.plan_id:
        return True
    
    plan = db.query(PlanSuscripcion).filter(PlanSuscripcion.id == taller.plan_id).first()
    if not plan:
        return True
    
    # Resetear contador si es nuevo mes
    hoy = datetime.now().date()
    if taller.ultimo_reset_incidentes is None or taller.ultimo_reset_incidentes.date() != hoy:
        taller.incidentes_mes_actual = 0
        taller.ultimo_reset_incidentes = datetime.now()
        db.commit()
    
    return (taller.incidentes_mes_actual or 0) < plan.limite_incidentes_mensual


def incrementar_contador_incidentes(db: Session, taller_id: int):
    """Incrementa el contador de incidentes del mes"""
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    if taller:
        taller.incidentes_mes_actual = (taller.incidentes_mes_actual or 0) + 1
        db.commit()


def suscripcion_activa(taller: Taller) -> bool:
    """Verifica si la suscripción del taller está activa"""
    if not taller.suscripcion_activa_hasta:
        return False
    return taller.suscripcion_activa_hasta > datetime.now()


def actualizar_suscripcion(
    db: Session, 
    taller_id: int, 
    plan_id: int, 
    periodo: str
) -> Taller | None:
    """Actualiza la suscripción de un taller (llamar después de pago exitoso)"""
    taller = db.query(Taller).filter(Taller.id == taller_id).first()
    plan = db.query(PlanSuscripcion).filter(PlanSuscripcion.id == plan_id).first()
    
    if not taller or not plan:
        return None
    
    # Calcular fecha de vencimiento
    dias = 30 if periodo == "mensual" else 365
    fecha_vencimiento = datetime.now() + timedelta(days=dias)
    
    taller.plan_id = plan_id
    taller.suscripcion_activa_hasta = fecha_vencimiento
    
    db.commit()
    db.refresh(taller)
    
    return taller