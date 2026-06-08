from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case as sa_case, cast, extract
from sqlalchemy import Date as SADate
from typing import Optional
from datetime import datetime as pydatetime, timedelta, timezone

from app.api.deps import get_db, obtener_super_admin_actual
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.models.incidente import Incidente
from app.models.cliente import Cliente
from app.models.plan_suscripcion import PlanSuscripcion
from app.models.pago_suscripcion import PagoSuscripcion
from app.models.factura import Factura

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
    ahora = pydatetime.now(timezone.utc)
    inicio_mes = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Totales básicos ───────────────────────────────────────────
    total_talleres = db.query(func.count(Taller.id)).scalar() or 0
    total_incidentes = db.query(func.count(Incidente.id)).scalar() or 0
    total_clientes = db.query(func.count(Cliente.id)).scalar() or 0

    # ── Ingresos por planes (pagos de suscripción completados) ────
    ingresos_planes = float(
        db.query(func.sum(PagoSuscripcion.monto))
        .filter(PagoSuscripcion.estado == 'completado')
        .scalar() or 0
    )

    # ── Ingresos por comisiones (facturas pagadas) ────────────────
    ingresos_comisiones = float(
        db.query(func.sum(Factura.comision_plataforma))
        .filter(Factura.estado == 'pagada')
        .scalar() or 0
    )

    # ── Talleres activos (suscripción vigente hoy) ────────────────
    talleres_activos = db.query(func.count(Taller.id)).filter(
        Taller.suscripcion_activa_hasta >= ahora
    ).scalar() or 0

    # ── Incidentes este mes ───────────────────────────────────────
    incidentes_mes = db.query(func.count(Incidente.id)).filter(
        Incidente.creado_en >= inicio_mes
    ).scalar() or 0

    # ── Tasa de finalización ──────────────────────────────────────
    finalizados = db.query(func.count(Incidente.id)).filter(
        Incidente.estado == 'finalizado'
    ).scalar() or 0
    tasa_finalizacion = round((finalizados / total_incidentes) * 100, 1) if total_incidentes > 0 else 0.0

    # ── Facturas pendientes de pago ───────────────────────────────
    facturas_pendientes = db.query(func.count(Factura.id)).filter(
        Factura.estado == 'pendiente'
    ).scalar() or 0

    # ── Talleres por plan ─────────────────────────────────────────
    plan_stats = db.query(
        PlanSuscripcion.nombre,
        func.count(Taller.id).label("cantidad")
    ).join(Taller, Taller.plan_id == PlanSuscripcion.id).group_by(
        PlanSuscripcion.id, PlanSuscripcion.nombre
    ).all()

    talleres_por_plan = [
        {"nombre": p.nombre, "cantidad": p.cantidad}
        for p in plan_stats
    ]

    return {
        "totales": {
            "talleres": total_talleres,
            "incidentes": total_incidentes,
            "clientes": total_clientes,
            "ingresos_planes_usd": round(ingresos_planes, 2),
            "ingresos_comisiones_usd": round(ingresos_comisiones, 2),
            "ingresos_totales_usd": round(ingresos_planes + ingresos_comisiones, 2),
        },
        "salud": {
            "talleres_activos": talleres_activos,
            "incidentes_este_mes": incidentes_mes,
            "tasa_finalizacion_pct": tasa_finalizacion,
            "facturas_pendientes": facturas_pendientes,
        },
        "talleres_por_plan": talleres_por_plan,
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


# ============================================================
# ANALÍTICA OPERACIONAL - KPIs
# ============================================================

@router.get("/analytics")
def admin_analytics(
    taller_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin=Depends(obtener_super_admin_actual),
):
    """KPIs operacionales para el panel de analítica del super admin"""
    from app.models.asignacion_taller import AsignacionTaller
    from app.models.historial_estado_incidente import HistorialEstadoIncidente

    SLA_MINUTOS = 60

    # Subquery: IDs de incidentes del taller filtrado (None = todos)
    sq_taller = None
    taller_filtrado_nombre = None
    if taller_id:
        sq_taller = (
            db.query(AsignacionTaller.incidente_id)
            .filter(AsignacionTaller.taller_id == taller_id)
            .subquery()
        )
        taller_obj = db.query(Taller).filter(Taller.id == taller_id).first()
        taller_filtrado_nombre = taller_obj.nombre if taller_obj else None

    def _filtrar(q):
        """Aplica filtro de taller sobre un query que ya tiene Incidente en scope."""
        if sq_taller is not None:
            return q.filter(Incidente.id.in_(sq_taller))
        return q

    # ── 1. TIEMPOS PROMEDIO ──────────────────────────────────────

    q_ra = db.query(
        func.avg(
            extract("epoch", AsignacionTaller.fecha_asignacion - Incidente.creado_en) / 60
        )
    ).join(Incidente, Incidente.id == AsignacionTaller.incidente_id).filter(
        extract("epoch", AsignacionTaller.fecha_asignacion - Incidente.creado_en) / 60 > 0,
        extract("epoch", AsignacionTaller.fecha_asignacion - Incidente.creado_en) / 60 < 300,
    )
    if taller_id:
        q_ra = q_ra.filter(AsignacionTaller.taller_id == taller_id)
    tiempo_ra = q_ra.scalar() or 0

    q_ae = db.query(
        func.avg(
            extract("epoch", Incidente.fecha_atencion - AsignacionTaller.fecha_asignacion) / 60
        )
    ).join(AsignacionTaller, AsignacionTaller.incidente_id == Incidente.id).filter(
        Incidente.fecha_atencion.isnot(None),
        extract("epoch", Incidente.fecha_atencion - AsignacionTaller.fecha_asignacion) / 60 > 0,
        extract("epoch", Incidente.fecha_atencion - AsignacionTaller.fecha_asignacion) / 60 < 300,
    )
    if taller_id:
        q_ae = q_ae.filter(AsignacionTaller.taller_id == taller_id)
    tiempo_ae = q_ae.scalar() or 0

    t_ra = round(float(tiempo_ra), 1)
    t_ae = round(float(tiempo_ae), 1)

    # ── 2. INCIDENTES POR TIPO ───────────────────────────────────

    q_tipos = db.query(
        Incidente.clasificacion_ia,
        func.count(Incidente.id).label("cnt")
    )
    q_tipos = _filtrar(q_tipos)
    tipos_raw = q_tipos.group_by(Incidente.clasificacion_ia).all()

    total_tipados = sum(r.cnt for r in tipos_raw) or 1
    incidentes_por_tipo = sorted(
        [
            {
                "tipo": r.clasificacion_ia or "sin_clasificar",
                "count": r.cnt,
                "porcentaje": round((r.cnt / total_tipados) * 100, 1),
            }
            for r in tipos_raw
        ],
        key=lambda x: x["count"],
        reverse=True,
    )

    # ── 3. SLA GLOBAL ────────────────────────────────────────────

    q_fin = _filtrar(db.query(func.count(Incidente.id)).filter(
        Incidente.estado == "finalizado",
        Incidente.fecha_finalizacion.isnot(None),
    ))
    total_fin = q_fin.scalar() or 0

    q_sla = _filtrar(db.query(func.count(Incidente.id)).filter(
        Incidente.estado == "finalizado",
        Incidente.fecha_finalizacion.isnot(None),
        extract("epoch", Incidente.fecha_finalizacion - Incidente.creado_en) / 60 <= SLA_MINUTOS,
    ))
    den_sla = q_sla.scalar() or 0

    sla_pct = round((den_sla / total_fin) * 100, 1) if total_fin > 0 else 0.0

    # ── 4. CANCELADOS ────────────────────────────────────────────

    q_cant = _filtrar(db.query(func.count(Incidente.id)).filter(Incidente.estado == "cancelado"))
    total_cancelados = q_cant.scalar() or 0

    q_cancelados = (
        db.query(Incidente, HistorialEstadoIncidente)
        .join(
            HistorialEstadoIncidente,
            (HistorialEstadoIncidente.incidente_id == Incidente.id) &
            (HistorialEstadoIncidente.estado_nuevo == "cancelado"),
        )
        .filter(Incidente.estado == "cancelado")
    )
    if sq_taller is not None:
        q_cancelados = q_cancelados.filter(Incidente.id.in_(sq_taller))
    cancelados_raw = q_cancelados.order_by(Incidente.creado_en.desc()).limit(8).all()

    # Preload names cache to avoid N+1
    _cache_taller: dict = {}
    _cache_cliente: dict = {}

    cancelados_data = []
    for inc, hist in cancelados_raw:
        usuario_raw = hist.usuario_que_cambio or ""
        if usuario_raw.startswith("taller_"):
            tipo_cancelador = "taller"
            tid = int(usuario_raw.split("_")[1])
            if tid not in _cache_taller:
                obj = db.query(Taller).filter(Taller.id == tid).first()
                _cache_taller[tid] = obj.nombre if obj else f"Taller #{tid}"
            nombre_cancelador = _cache_taller[tid]
        elif usuario_raw.startswith("cliente_"):
            tipo_cancelador = "cliente"
            cid = int(usuario_raw.split("_")[1])
            if cid not in _cache_cliente:
                obj = db.query(Cliente).filter(Cliente.id == cid).first()
                _cache_cliente[cid] = obj.nombre_completo if obj else f"Cliente #{cid}"
            nombre_cancelador = _cache_cliente[cid]
        else:
            tipo_cancelador = "sistema"
            nombre_cancelador = "Sistema"

        obs = hist.observacion or ""
        es_default = (
            obs == "Cancelado por el cliente" or
            obs.startswith("Cancelado por el taller:")
        )
        motivo_limpio = None if es_default else obs

        cancelados_data.append({
            "id": inc.id,
            "clasificacion": inc.clasificacion_ia or "sin_clasificar",
            "descripcion": (inc.descripcion or "")[:80],
            "creado_en": inc.creado_en.isoformat(),
            "tipo_cancelador": tipo_cancelador,
            "nombre_cancelador": nombre_cancelador,
            "motivo": motivo_limpio,
        })

    # ── 5. TALLERES EFICIENTES ───────────────────────────────────

    q_taller_stats = (
        db.query(
            Taller.id,
            Taller.nombre,
            func.count(Incidente.id).label("total_atendidos"),
            func.avg(
                extract("epoch", AsignacionTaller.fecha_asignacion - Incidente.creado_en) / 60
            ).label("t_respuesta"),
            func.sum(
                sa_case(
                    (
                        (Incidente.estado == "finalizado")
                        & (Incidente.fecha_finalizacion.isnot(None))
                        & (
                            extract("epoch", Incidente.fecha_finalizacion - Incidente.creado_en)
                            / 60
                            <= SLA_MINUTOS
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("den_sla"),
            func.sum(
                sa_case(
                    (
                        (Incidente.estado == "finalizado")
                        & (Incidente.fecha_finalizacion.isnot(None)),
                        1,
                    ),
                    else_=0,
                )
            ).label("total_fin_t"),
        )
        .join(AsignacionTaller, AsignacionTaller.taller_id == Taller.id)
        .join(Incidente, Incidente.id == AsignacionTaller.incidente_id)
        .group_by(Taller.id, Taller.nombre)
    )
    if taller_id:
        q_taller_stats = q_taller_stats.filter(Taller.id == taller_id)
    taller_stats = q_taller_stats.all()

    talleres_eficientes = []
    for t in taller_stats:
        t_fin = int(t.total_fin_t or 0)
        d_sla_t = int(t.den_sla or 0)
        sla_t = round((d_sla_t / t_fin) * 100, 1) if t_fin > 0 else 0.0
        talleres_eficientes.append(
            {
                "id": t.id,
                "nombre": t.nombre,
                "total_atendidos": t.total_atendidos,
                "tiempo_respuesta_avg_min": round(float(t.t_respuesta or 0), 1),
                "sla_porcentaje": sla_t,
            }
        )
    talleres_eficientes.sort(key=lambda x: x["sla_porcentaje"], reverse=True)
    talleres_eficientes = talleres_eficientes[:5]

    # ── 6. ZONAS + PUNTOS MAPA (Santa Cruz de la Sierra) ─────────

    LAT_CENTRO = -17.7833
    LON_CENTRO = -63.1822

    q_puntos = db.query(
        Incidente.id,
        Incidente.latitud,
        Incidente.longitud,
        Incidente.clasificacion_ia,
        Incidente.estado,
        Incidente.creado_en,
    ).filter(
        Incidente.latitud.isnot(None),
        Incidente.longitud.isnot(None),
    )
    q_puntos = _filtrar(q_puntos)
    puntos_db = q_puntos.all()

    zonas_cnt: dict = {"Norte": 0, "Sur": 0, "Este": 0, "Oeste": 0}
    puntos_mapa = []

    for p in puntos_db:
        dlat = p.latitud - LAT_CENTRO
        dlon = p.longitud - LON_CENTRO
        zona = (
            ("Norte" if dlat > 0 else "Sur")
            if abs(dlat) >= abs(dlon)
            else ("Este" if dlon > 0 else "Oeste")
        )
        zonas_cnt[zona] += 1
        puntos_mapa.append(
            {
                "id": p.id,
                "lat": p.latitud,
                "lng": p.longitud,
                "tipo": p.clasificacion_ia or "sin_clasificar",
                "estado": p.estado,
                "fecha": p.creado_en.isoformat(),
                "zona": zona,
            }
        )

    total_zonas = sum(zonas_cnt.values()) or 1
    zonas_dist = sorted(
        [
            {"zona": z, "count": c, "porcentaje": round((c / total_zonas) * 100, 1)}
            for z, c in zonas_cnt.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )

    # ── 7. TENDENCIA SLA SEMANAL (últimos 7 días) ─────────────────

    hoy = pydatetime.now(timezone.utc).date()
    hace_7 = hoy - timedelta(days=6)

    q_trend = db.query(
        cast(Incidente.fecha_finalizacion, SADate).label("dia"),
        func.count(Incidente.id).label("total"),
        func.sum(
            sa_case(
                (
                    extract("epoch", Incidente.fecha_finalizacion - Incidente.creado_en)
                    / 60
                    <= SLA_MINUTOS,
                    1,
                ),
                else_=0,
            )
        ).label("den_sla"),
    ).filter(
        Incidente.estado == "finalizado",
        Incidente.fecha_finalizacion.isnot(None),
        cast(Incidente.fecha_finalizacion, SADate) >= hace_7,
        cast(Incidente.fecha_finalizacion, SADate) <= hoy,
    )
    q_trend = _filtrar(q_trend)
    trend_raw = q_trend.group_by(cast(Incidente.fecha_finalizacion, SADate)).all()

    dias_lookup = {r.dia: (r.total, int(r.den_sla or 0)) for r in trend_raw}
    DIAS = {0: "Lun", 1: "Mar", 2: "Mié", 3: "Jue", 4: "Vie", 5: "Sáb", 6: "Dom"}

    tendencia = []
    for i in range(6, -1, -1):
        dia = hoy - timedelta(days=i)
        total_d, den_d = dias_lookup.get(dia, (0, 0))
        sla_d = round((den_d / total_d) * 100) if total_d > 0 else 0
        tendencia.append(
            {
                "dia": DIAS[dia.weekday()],
                "es_hoy": i == 0,
                "porcentaje_sla": sla_d,
                "total_finalizados": total_d,
            }
        )

    return {
        "filtro_taller": {
            "id": taller_id,
            "nombre": taller_filtrado_nombre,
        },
        "kpis_tiempos": {
            "tiempo_reporte_asignacion_min": t_ra,
            "tiempo_asignacion_encamino_min": t_ae,
            "tiempo_total_respuesta_min": round(t_ra + t_ae, 1),
        },
        "sla": {
            "total_finalizados": total_fin,
            "dentro_sla": den_sla,
            "porcentaje": sla_pct,
            "sla_minutos_objetivo": SLA_MINUTOS,
        },
        "incidentes_por_tipo": incidentes_por_tipo,
        "cancelados": {
            "total": total_cancelados,
            "recientes": cancelados_data,
        },
        "talleres_eficientes": talleres_eficientes,
        "zonas": {
            "distribucion": zonas_dist,
            "puntos_mapa": puntos_mapa,
        },
        "tendencia_sla_semanal": tendencia,
    }