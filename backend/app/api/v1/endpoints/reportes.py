# backend/app/api/v1/endpoints/reportes.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from collections import defaultdict

from app.api.deps import get_db, obtener_taller_actual
from app.models.taller import Taller
from app.models.incidente import Incidente
from app.models.factura import Factura, EstadoFacturaEnum
from app.models.pago import Pago
from app.models.asignacion_taller import AsignacionTaller
from app.models.tecnico import Tecnico

router = APIRouter()


@router.get("/dashboard/resumen")
def obtener_resumen_dashboard(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Dict[str, Any]:
    """
    Obtener resumen para el dashboard del taller:
    - Totales de incidentes
    - Ingresos y comisiones
    - Incidentes por estado
    """
    
    # Obtener IDs de incidentes asignados a este taller
    incidentes_asignados = db.query(AsignacionTaller.incidente_id).filter(
        AsignacionTaller.taller_id == taller_actual.id
    ).subquery()
    
    # Incidentes totales
    total_incidentes = db.query(Incidente).filter(
        Incidente.id.in_(incidentes_asignados)
    ).count()
    
    # Incidentes por estado
    incidentes_por_estado = db.query(
        Incidente.estado, func.count(Incidente.id)
    ).filter(
        Incidente.id.in_(incidentes_asignados)
    ).group_by(Incidente.estado).all()
    
    # Facturas del taller
    facturas = db.query(Factura).filter(
        Factura.taller_id == taller_actual.id
    ).all()
    
    total_facturado = sum(f.total for f in facturas)
    total_comisiones = sum(f.comision_plataforma for f in facturas)
    total_neto_taller = sum(f.monto_neto_taller for f in facturas)
    
    # Facturas pendientes
    facturas_pendientes = db.query(Factura).filter(
        Factura.taller_id == taller_actual.id,
        Factura.estado == EstadoFacturaEnum.PENDIENTE
    ).all()
    total_pendiente = sum(f.total for f in facturas_pendientes)
    
    # Facturas pagadas
    facturas_pagadas = db.query(Factura).filter(
        Factura.taller_id == taller_actual.id,
        Factura.estado == EstadoFacturaEnum.PAGADA
    ).all()
    total_pagado = sum(f.total for f in facturas_pagadas)
    
    # Técnicos activos
    total_tecnicos = db.query(Tecnico).filter(
        Tecnico.taller_id == taller_actual.id,
        Tecnico.activo == True
    ).count()
    
    return {
        "totales": {
            "incidentes": total_incidentes,
            "facturado": round(total_facturado, 2),
            "comisiones": round(total_comisiones, 2),
            "neto_taller": round(total_neto_taller, 2),
            "pendiente_pago": round(total_pendiente, 2),
            "pagado": round(total_pagado, 2),
            "tecnicos_activos": total_tecnicos,
        },
        "incidentes_por_estado": [
            {"estado": estado, "cantidad": cantidad}
            for estado, cantidad in incidentes_por_estado
        ],
    }


@router.get("/ingresos-mensuales")
def obtener_ingresos_mensuales(
    meses: int = Query(6, ge=1, le=24, description="Número de meses hacia atrás"),
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Dict[str, Any]:
    """
    Obtener ingresos mensuales para gráfico de barras.
    Retorna datos agrupados por mes: facturado, comisiones, neto
    """
    
    fecha_corte = datetime.now() - timedelta(days=meses * 30)
    
    # Obtener facturas del taller agrupadas por mes
    resultados = db.query(
        func.date_trunc('month', Factura.creado_en).label('mes'),
        func.sum(Factura.total).label('total_facturado'),
        func.sum(Factura.comision_plataforma).label('total_comisiones'),
        func.sum(Factura.monto_neto_taller).label('total_neto'),
    ).filter(
        Factura.taller_id == taller_actual.id,
        Factura.creado_en >= fecha_corte
    ).group_by(
        func.date_trunc('month', Factura.creado_en)
    ).order_by(
        func.date_trunc('month', Factura.creado_en)
    ).all()
    
    # Formatear datos para el frontend
    labels = []
    facturado_data = []
    comisiones_data = []
    neto_data = []
    
    for mes, facturado, comisiones, neto in resultados:
        labels.append(mes.strftime("%b %Y"))  # Ej: "Ene 2025"
        facturado_data.append(round(float(facturado or 0), 2))
        comisiones_data.append(round(float(comisiones or 0), 2))
        neto_data.append(round(float(neto or 0), 2))
    
    return {
        "labels": labels,
        "datasets": {
            "facturado": facturado_data,
            "comisiones": comisiones_data,
            "neto": neto_data,
        }
    }


@router.get("/incidentes-por-clasificacion")
def obtener_incidentes_por_clasificacion(
    fecha_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Dict[str, Any]:
    """
    Obtener incidentes agrupados por clasificación IA para gráfico de pastel.
    """
    
    # Obtener incidentes asignados a este taller
    incidentes_asignados = db.query(AsignacionTaller.incidente_id).filter(
        AsignacionTaller.taller_id == taller_actual.id
    ).subquery()
    
    query = db.query(
        Incidente.clasificacion_ia,
        func.count(Incidente.id).label('cantidad')
    ).filter(
        Incidente.id.in_(incidentes_asignados)
    )
    
    # Aplicar filtros de fecha si existen
    if fecha_inicio:
        query = query.filter(Incidente.creado_en >= datetime.fromisoformat(fecha_inicio))
    if fecha_fin:
        query = query.filter(Incidente.creado_en <= datetime.fromisoformat(fecha_fin))
    
    resultados = query.group_by(Incidente.clasificacion_ia).all()
    
    # Colores para cada clasificación
    colores = {
        "bateria": "#f59e0b",  # Ámbar
        "llanta": "#10b981",    # Esmeralda
        "choque": "#ef4444",    # Rojo
        "motor": "#3b82f6",     # Azul
        "llave": "#8b5cf6",     # Violeta
        "grua": "#ec4899",      # Rosa
        "incierto": "#6b7280",  # Gris
    }
    
    datos = []
    for clasificacion, cantidad in resultados:
        clasificacion_clean = clasificacion or "incierto"
        datos.append({
            "clasificacion": clasificacion_clean,
            "cantidad": cantidad,
            "color": colores.get(clasificacion_clean, "#6b7280"),
        })
    
    return {
        "datos": datos,
        "total": sum(d["cantidad"] for d in datos),
    }


@router.get("/servicios-facturados")
def obtener_servicios_facturados(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    estado_factura: Optional[str] = Query(None, description="pendiente, pagada"),
    fecha_inicio: Optional[str] = Query(None, description="YYYY-MM-DD"),
    fecha_fin: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Dict[str, Any]:
    """
    Obtener lista de servicios facturados con detalles de cliente y montos.
    """
    
    query = db.query(
        Factura,
        Incidente.clasificacion_ia,
        Incidente.descripcion,
        Incidente.creado_en.label('fecha_incidente'),
    ).join(
        Incidente, Incidente.id == Factura.incidente_id
    ).filter(
        Factura.taller_id == taller_actual.id
    )
    
    # Aplicar filtros
    if estado_factura:
        query = query.filter(Factura.estado == estado_factura)
    if fecha_inicio:
        query = query.filter(Factura.creado_en >= datetime.fromisoformat(fecha_inicio))
    if fecha_fin:
        query = query.filter(Factura.creado_en <= datetime.fromisoformat(fecha_fin))
    
    total = query.count()
    
    resultados = query.order_by(Factura.creado_en.desc()).offset(skip).limit(limit).all()
    
    servicios = []
    for factura, clasificacion, descripcion, fecha_incidente in resultados:
        servicios.append({
            "id": factura.id,
            "numero_factura": factura.numero_factura,
            "fecha_factura": factura.creado_en.isoformat(),
            "fecha_incidente": fecha_incidente.isoformat() if fecha_incidente else None,
            "cliente_nombre": factura.cliente.nombre_completo if factura.cliente else "N/A",
            "cliente_email": factura.cliente.email if factura.cliente else "N/A",
            "clasificacion_ia": clasificacion or "incierto",
            "descripcion": descripcion[:100] if descripcion else "Sin descripción",
            "total": float(factura.total),
            "comision_plataforma": float(factura.comision_plataforma),
            "monto_neto_taller": float(factura.monto_neto_taller),
            "estado": factura.estado.value if hasattr(factura.estado, 'value') else str(factura.estado),
            "pagado_en": factura.pagado_en.isoformat() if factura.pagado_en else None,
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "servicios": servicios,
    }


@router.get("/top-tecnicos")
def obtener_top_tecnicos(
    meses: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Dict[str, Any]:
    """
    Obtener top de técnicos por incidentes atendidos.
    """
    
    fecha_corte = datetime.now() - timedelta(days=meses * 30)
    
    # Obtener incidentes asignados a este taller en el período
    incidentes_asignados = db.query(AsignacionTaller.incidente_id).filter(
        AsignacionTaller.taller_id == taller_actual.id,
        AsignacionTaller.es_aceptado == True,
    ).subquery()
    
    resultados = db.query(
        Tecnico.id,
        Tecnico.nombre_completo,
        Tecnico.especialidad,
        func.count(AsignacionTaller.id).label('total_incidentes')
    ).join(
        AsignacionTaller, AsignacionTaller.tecnico_id == Tecnico.id
    ).filter(
        Tecnico.taller_id == taller_actual.id,
        AsignacionTaller.incidente_id.in_(incidentes_asignados),
        AsignacionTaller.fecha_asignacion >= fecha_corte
    ).group_by(
        Tecnico.id, Tecnico.nombre_completo, Tecnico.especialidad
    ).order_by(
        func.count(AsignacionTaller.id).desc()
    ).limit(5).all()
    
    tecnicos = []
    for id, nombre, especialidad, total_incidentes in resultados:
        tecnicos.append({
            "id": id,
            "nombre": nombre,
            "especialidad": especialidad or "General",
            "total_incidentes": total_incidentes,
        })
    
    return {
        "tecnicos": tecnicos,
        "periodo_meses": meses,
    }


@router.get("/tendencias")
def obtener_tendencias(
    db: Session = Depends(get_db),
    taller_actual: Taller = Depends(obtener_taller_actual),
) -> Dict[str, Any]:
    """
    Obtener tendencias comparativas:
    - Incidentes este mes vs mes pasado
    - Ingresos este mes vs mes pasado
    """
    
    hoy = datetime.now()
    inicio_mes_actual = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    inicio_mes_pasado = (inicio_mes_actual - timedelta(days=1)).replace(day=1)
    fin_mes_pasado = inicio_mes_actual - timedelta(days=1)
    
    incidentes_asignados = db.query(AsignacionTaller.incidente_id).filter(
        AsignacionTaller.taller_id == taller_actual.id
    ).subquery()
    
    # Incidentes mes actual
    incidentes_mes_actual = db.query(Incidente).filter(
        Incidente.id.in_(incidentes_asignados),
        Incidente.creado_en >= inicio_mes_actual,
        Incidente.creado_en <= hoy
    ).count()
    
    # Incidentes mes pasado
    incidentes_mes_pasado = db.query(Incidente).filter(
        Incidente.id.in_(incidentes_asignados),
        Incidente.creado_en >= inicio_mes_pasado,
        Incidente.creado_en <= fin_mes_pasado
    ).count()
    
    # Facturas mes actual
    facturas_mes_actual = db.query(Factura).filter(
        Factura.taller_id == taller_actual.id,
        Factura.creado_en >= inicio_mes_actual,
        Factura.creado_en <= hoy
    ).all()
    ingresos_mes_actual = sum(f.total for f in facturas_mes_actual)
    
    # Facturas mes pasado
    facturas_mes_pasado = db.query(Factura).filter(
        Factura.taller_id == taller_actual.id,
        Factura.creado_en >= inicio_mes_pasado,
        Factura.creado_en <= fin_mes_pasado
    ).all()
    ingresos_mes_pasado = sum(f.total for f in facturas_mes_pasado)
    
    # Calcular porcentajes de cambio
    def calcular_cambio(actual, pasado):
        if pasado == 0:
            return 100 if actual > 0 else 0
        return round(((actual - pasado) / pasado) * 100, 1)
    
    return {
        "incidentes": {
            "actual": incidentes_mes_actual,
            "pasado": incidentes_mes_pasado,
            "cambio_porcentaje": calcular_cambio(incidentes_mes_actual, incidentes_mes_pasado),
        },
        "ingresos": {
            "actual": round(float(ingresos_mes_actual), 2),
            "pasado": round(float(ingresos_mes_pasado), 2),
            "cambio_porcentaje": calcular_cambio(ingresos_mes_actual, ingresos_mes_pasado),
        },
    }