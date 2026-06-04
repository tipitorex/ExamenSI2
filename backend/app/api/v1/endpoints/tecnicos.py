from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from math import radians, sin, cos, sqrt, atan2

from app.api.deps import get_db, obtener_taller_actual, obtener_tecnico_actual
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.schemas.tecnico import (
    TecnicoActualizar,
    TecnicoCrear,
    TecnicoDisponibilidadActualizar,
    TecnicoRespuesta,
    TecnicoInicioSesion,
)
from app.services.tecnico_servicio import (
    actualizar_disponibilidad_tecnico,
    actualizar_tecnico,
    crear_tecnico,
    eliminar_tecnico,
    listar_tecnicos_por_taller,
    obtener_tecnico_por_id,
)
from app.services.autenticacion_servicio import autenticar_tecnico, crear_token_acceso

router = APIRouter()


@router.post("")
def crear_tecnico_taller(
    payload: TecnicoCrear,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TecnicoRespuesta:
    tecnico = crear_tecnico(db, taller_actual.id, payload)
    return TecnicoRespuesta.model_validate(tecnico)


@router.get("")
def listar_tecnicos(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> list[TecnicoRespuesta]:
    tecnicos = listar_tecnicos_por_taller(db, taller_actual.id)
    return [TecnicoRespuesta.model_validate(t) for t in tecnicos]


@router.put("/{tecnico_id}")
def editar_tecnico(
    tecnico_id: int,
    payload: TecnicoActualizar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TecnicoRespuesta:
    tecnico = obtener_tecnico_por_id(db, tecnico_id)
    if tecnico is None or tecnico.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tecnico no encontrado")

    tecnico_actualizado = actualizar_tecnico(db, tecnico, payload)
    return TecnicoRespuesta.model_validate(tecnico_actualizado)


@router.patch("/{tecnico_id}/disponibilidad")
def cambiar_disponibilidad_tecnico(
    tecnico_id: int,
    payload: TecnicoDisponibilidadActualizar,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> TecnicoRespuesta:
    tecnico = obtener_tecnico_por_id(db, tecnico_id)
    if tecnico is None or tecnico.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tecnico no encontrado")

    tecnico_actualizado = actualizar_disponibilidad_tecnico(db, tecnico, payload.disponible)
    return TecnicoRespuesta.model_validate(tecnico_actualizado)


@router.delete("/{tecnico_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_tecnico(
    tecnico_id: int,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Response:
    tecnico = obtener_tecnico_por_id(db, tecnico_id)
    if tecnico is None or tecnico.taller_id != taller_actual.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tecnico no encontrado")

    eliminar_tecnico(db, tecnico)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ============================================================
# ENDPOINT DE LOGIN PARA TÉCNICO
# ============================================================

@router.post("/iniciar-sesion")
def iniciar_sesion_tecnico(
    payload: TecnicoInicioSesion, 
    db: Session = Depends(get_db)
):
    """Inicio de sesión para técnico"""
    tecnico = autenticar_tecnico(db, payload.email, payload.contrasena)
    if tecnico is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    token_acceso = crear_token_acceso(subject=str(tecnico.id), tipo="tecnico")
    
    return {
        "token_acceso": token_acceso,
        "tipo_token": "bearer",
        "tecnico": {
            "id": tecnico.id,
            "taller_id": tecnico.taller_id,
            "nombre_completo": tecnico.nombre_completo,
            "telefono": tecnico.telefono,
            "especialidad": tecnico.especialidad,
            "disponible": tecnico.disponible,
            "activo": tecnico.activo,
        }
    }


# ============================================================
# ENDPOINT PARA OBTENER ASIGNACIONES DEL TÉCNICO
# ============================================================

@router.get("/mis-asignaciones")
def obtener_mis_asignaciones(
    db: Session = Depends(get_db),
    tecnico_actual: Tecnico = Depends(obtener_tecnico_actual),
):
    """
    Obtiene todas las asignaciones (incidentes) asignadas al técnico actual.
    Incluye datos del cliente, ubicación y estado.
    """
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.incidente import Incidente
    from app.models.cliente import Cliente
    
    # Buscar asignaciones donde el técnico es el actual y están aceptadas
    asignaciones = db.query(AsignacionTaller).filter(
        AsignacionTaller.tecnico_id == tecnico_actual.id,
        AsignacionTaller.es_aceptado == True
    ).all()
    
    resultados = []
    
    for asignacion in asignaciones:
        incidente = db.query(Incidente).filter(Incidente.id == asignacion.incidente_id).first()
        if incidente:
            cliente = db.query(Cliente).filter(Cliente.id == incidente.cliente_id).first()
            
            resultados.append({
                "id": asignacion.id,
                "incidente_id": incidente.id,
                "taller_id": asignacion.taller_id,
                "tecnico_id": asignacion.tecnico_id,
                "estado": incidente.estado,
                "cliente_nombre": cliente.nombre_completo if cliente else "Cliente",
                "cliente_telefono": cliente.telefono if cliente else "",
                "descripcion": incidente.descripcion,
                "latitud": incidente.latitud,
                "longitud": incidente.longitud,
                "direccion": incidente.direccion_texto or "",
                "tiempo_estimado": asignacion.tiempo_estimado_llegada_minutos,
                "clasificacion_ia": incidente.clasificacion_ia,
                "prioridad": incidente.prioridad,
            })
    
    return resultados


# ============================================================
# ENDPOINT - Técnicos disponibles con distancia y recomendación IA
# ============================================================

def calcular_distancia_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula de Haversine"""
    R = 6371  # Radio de la Tierra en km
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    
    a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


@router.get("/disponibles-cercanos")
def obtener_tecnicos_disponibles_cercanos(
    incidente_lat: float,
    incidente_lng: float,
    clasificacion_ia: str | None = None,
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
):
    """
    Obtiene los técnicos disponibles del taller actual con:
    - Distancia calculada hasta el incidente
    - Tiempo estimado de llegada
    - Score de recomendación (basado en especialidad y cercanía)
    - Marca al técnico recomendado por IA
    """
    from app.models.tecnico import Tecnico
    
    # Obtener técnicos del taller que están disponibles y activos
    tecnicos = db.query(Tecnico).filter(
        Tecnico.taller_id == taller_actual.id,
        Tecnico.disponible == True,
        Tecnico.activo == True
    ).all()
    
    if not tecnicos:
        return {
            "tecnicos": [],
            "recomendado_id": None,
            "mensaje": "No hay técnicos disponibles en este momento"
        }
    
    # Obtener ubicación del taller (fallback si el técnico no tiene ubicación propia)
    taller_lat = taller_actual.latitud
    taller_lng = taller_actual.longitud
    
    resultados = []
    
    for t in tecnicos:
        # Usar ubicación actual del técnico, o fallback a la ubicación del taller
        lat_tec = t.latitud_actual if t.latitud_actual is not None else taller_lat
        lng_tec = t.longitud_actual if t.longitud_actual is not None else taller_lng
        
        distancia = None
        tiempo_estimado = None
        
        if lat_tec is not None and lng_tec is not None:
            distancia = calcular_distancia_km(lat_tec, lng_tec, incidente_lat, incidente_lng)
            # Tiempo estimado: 2 minutos por km (ciudad) + 5 minutos base
            tiempo_estimado = int(distancia * 2) + 5
        
        # Calcular score de recomendación (IA)
        score = 50  # Score base
        
        # Bonus por especialidad (30 puntos)
        if clasificacion_ia and t.especialidad:
            mapa_especialidades = {
                "bateria": ["electrico", "bateria", "electronica", "eléctrico"],
                "llanta": ["llanta", "neumatico", "rueda"],
                "choque": ["choque", "carroceria", "latón", "colisión"],
                "motor": ["motor", "mecanica", "inyeccion"],
                "otros": []
            }
            
            palabras_clave = mapa_especialidades.get(clasificacion_ia.lower(), [])
            especialidad_lower = t.especialidad.lower()
            
            if any(palabra in especialidad_lower for palabra in palabras_clave):
                score += 30
        
        # Bonus por cercanía (20 puntos)
        if distancia is not None:
            if distancia <= 2:
                score += 20
            elif distancia <= 5:
                score += 15
            elif distancia <= 10:
                score += 10
            elif distancia <= 15:
                score += 5
        
        resultados.append({
            "id": t.id,
            "nombre_completo": t.nombre_completo,
            "telefono": t.telefono,
            "especialidad": t.especialidad,
            "distancia_km": round(distancia, 1) if distancia is not None else None,
            "tiempo_estimado_minutos": tiempo_estimado,
            "score_recomendacion": score,
            "disponible": t.disponible,
            "latitud_actual": t.latitud_actual,
            "longitud_actual": t.longitud_actual,
        })
    
    resultados.sort(key=lambda x: x["score_recomendacion"], reverse=True)
    
    recomendado_id = resultados[0]["id"] if resultados else None
    
    return {
        "tecnicos": resultados,
        "recomendado_id": recomendado_id,
        "total_tecnicos": len(resultados)
    }