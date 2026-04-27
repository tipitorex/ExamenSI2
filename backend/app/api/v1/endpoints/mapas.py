from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.models.incidente import Incidente
from app.models.asignacion_taller import AsignacionTaller

router = APIRouter()


@router.get("/incidentes-activos")
def obtener_incidentes_activos(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> List[Dict[str, Any]]:
    """
    Obtener todos los incidentes activos del taller para mostrar en el mapa.
    """
    
    incidentes_activos = db.query(Incidente).join(
        AsignacionTaller, AsignacionTaller.incidente_id == Incidente.id
    ).filter(
        AsignacionTaller.taller_id == taller_actual.id,
        Incidente.estado.in_(['pendiente', 'en_proceso'])
    ).all()
    
    resultado = []
    
    for incidente in incidentes_activos:
        # Determinar color según estado
        color = "#f59e0b" if incidente.estado == "pendiente" else "#3b82f6"
        
        resultado.append({
            "id": incidente.id,
            "latitud": incidente.latitud,
            "longitud": incidente.longitud,
            "estado": incidente.estado,
            "cliente_nombre": incidente.cliente.nombre_completo if incidente.cliente else "N/A",
            "cliente_telefono": incidente.cliente.telefono if incidente.cliente else "N/A",
            "descripcion": incidente.descripcion[:100] if incidente.descripcion else "",
            "clasificacion": incidente.clasificacion_ia or "incierto",
            "fecha_creacion": incidente.creado_en.isoformat(),
            "color": color
        })
    
    return resultado