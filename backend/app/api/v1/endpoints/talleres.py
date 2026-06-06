from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.schemas.taller import TallerCrear, TallerInicioSesion, TallerRespuesta, TallerTokenRespuesta
from app.services.autenticacion_servicio import autenticar_taller, crear_token_acceso
from app.services.taller_servicio import crear_taller, obtener_taller_por_email
from app.services.suscripcion_service import (
    obtener_plan_por_taller,
    verificar_limite_tecnicos,
    verificar_limite_incidentes_mensual,
    suscripcion_activa
)

router = APIRouter()


def serializar_taller(taller: Taller) -> TallerRespuesta:
    return TallerRespuesta(
        id=taller.id,
        nombre=taller.nombre,
        email=taller.email,
        telefono=taller.telefono,
        direccion=taller.direccion,
        latitud=taller.latitud,
        longitud=taller.longitud,
        servicios=[servicio.nombre for servicio in taller.servicios],
        activo=taller.activo,
        creado_en=taller.creado_en,
    )


@router.post("")
def registrar_taller(payload: TallerCrear, db: Session = Depends(get_db)) -> TallerRespuesta:
    taller_existente = obtener_taller_por_email(db, payload.email)
    if taller_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo del taller ya se encuentra registrado",
        )

    taller = crear_taller(db, payload)
    return serializar_taller(taller)


@router.post("/iniciar-sesion")
def iniciar_sesion_taller(payload: TallerInicioSesion, db: Session = Depends(get_db)) -> TallerTokenRespuesta:
    taller = autenticar_taller(db, payload.email, payload.contrasena)
    if taller is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales invalidas")

    token_acceso = crear_token_acceso(subject=str(taller.id), tipo="taller")
    return TallerTokenRespuesta(
        token_acceso=token_acceso,
        tipo_token="bearer",
        taller=serializar_taller(taller),
    )


@router.get("/perfil")
def obtener_perfil_taller(taller_actual: Taller = Depends(obtener_taller_actual)) -> TallerRespuesta:
    return serializar_taller(taller_actual)


# ============================================================
# NUEVO ENDPOINT - Obtener información del plan de suscripción
# ============================================================

@router.get("/mi-plan")
def obtener_mi_plan(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Obtiene la información del plan de suscripción del taller actual.
    Incluye límites y uso actual.
    """
    from app.models.tecnico import Tecnico
    
    plan = obtener_plan_por_taller(db, taller_actual.id)
    
    if not plan:
        return {
            "plan": None,
            "suscripcion_activa": False,
            "limite_tecnicos": 2,
            "limite_incidentes_mensual": 10,
            "tecnicos_actuales": 0,
            "incidentes_mes_actual": taller_actual.incidentes_mes_actual or 0,
        }
    
    # Contar técnicos activos del taller
    tecnicos_actuales = db.query(Tecnico).filter(
        Tecnico.taller_id == taller_actual.id,
        Tecnico.activo == True
    ).count()
    
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
        },
        "suscripcion_activa": suscripcion_activa(taller_actual),
        "suscripcion_activa_hasta": taller_actual.suscripcion_activa_hasta.isoformat() if taller_actual.suscripcion_activa_hasta else None,
        "limite_tecnicos": plan.limite_tecnicos,
        "tecnicos_actuales": tecnicos_actuales,
        "limite_incidentes_mensual": plan.limite_incidentes_mensual,
        "incidentes_mes_actual": taller_actual.incidentes_mes_actual or 0,
        "puede_agregar_tecnico": tecnicos_actuales < plan.limite_tecnicos,
        "puede_reportar_incidente": (taller_actual.incidentes_mes_actual or 0) < plan.limite_incidentes_mensual,
    }