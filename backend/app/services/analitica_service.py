# backend/app/services/analitica_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from fastapi import HTTPException
import json

from app.models.incidente import Incidente
from app.models.asignacion_taller import AsignacionTaller
from app.models.taller import Taller
from app.models.tecnico import Tecnico
from app.schemas.analitica import (
    DashboardAnaliticaResponse, KPIAsignacion, 
    IncidentesPorTipo, EficienciaTaller, TipoIncidente,
    IncidentesPorUbicacion, CasosCancelados, CumplimientoSLA
)

class AnaliticaService:
    
    @staticmethod
    def calcular_kpi_asignacion(
        db: Session, 
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None
    ) -> KPIAsignacion:
        """Calcula KPIs de tiempos de asignación y llegada"""
        
        query_asignaciones = db.query(AsignacionTaller)
        
        if fecha_inicio and fecha_fin:
            query_asignaciones = query_asignaciones.filter(
                AsignacionTaller.fecha_asignacion.between(fecha_inicio, fecha_fin)
            )
        
        asignaciones = query_asignaciones.all()
        
        tiempos_asignacion = []
        tiempos_llegada = []
        
        for asignacion in asignaciones:
            incidente = db.query(Incidente).filter(
                Incidente.id == asignacion.incidente_id
            ).first()
            
            if incidente and incidente.fecha_reporte:
                # Tiempo de asignación (reporte -> asignación)
                tiempo_asignacion = (asignacion.fecha_asignacion - incidente.fecha_reporte).total_seconds() / 60
                tiempos_asignacion.append(tiempo_asignacion)
                
                # Tiempo de llegada (asignación -> llegada confirmada)
                if asignacion.fecha_llegada:
                    tiempo_llegada = (asignacion.fecha_llegada - asignacion.fecha_asignacion).total_seconds() / 60
                    tiempos_llegada.append(tiempo_llegada)
        
        # Calcular promedios
        tiempo_prom_asignacion = sum(tiempos_asignacion) / len(tiempos_asignacion) if tiempos_asignacion else 0
        tiempo_prom_llegada = sum(tiempos_llegada) / len(tiempos_llegada) if tiempos_llegada else 0
        
        # Estadísticas de incidentes
        query_incidentes = db.query(Incidente)
        if fecha_inicio and fecha_fin:
            query_incidentes = query_incidentes.filter(
                Incidente.fecha_reporte.between(fecha_inicio, fecha_fin)
            )
        
        total_incidentes = query_incidentes.count()
        incidentes_resueltos = query_incidentes.filter(
            Incidente.estado == "resuelto"
        ).count()
        
        porcentaje_resolucion = (incidentes_resueltos / total_incidentes * 100) if total_incidentes > 0 else 0
        
        return KPIAsignacion(
            tiempo_promedio_asignacion_minutos=round(tiempo_prom_asignacion, 2),
            tiempo_promedio_llegada_minutos=round(tiempo_prom_llegada, 2),
            total_incidentes_periodo=total_incidentes,
            incidentes_resueltos=incidentes_resueltos,
            porcentaje_resolucion=round(porcentaje_resolucion, 2)
        )
    
    @staticmethod
    def obtener_incidentes_por_tipo(
        db: Session,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None
    ) -> List[IncidentesPorTipo]:
        """Agrupa incidentes por tipo"""
        
        query = db.query(
            Incidente.tipo_incidente,
            func.count(Incidente.id).label('cantidad')
        )
        
        if fecha_inicio and fecha_fin:
            query = query.filter(Incidente.fecha_reporte.between(fecha_inicio, fecha_fin))
        
        resultados = query.group_by(Incidente.tipo_incidente).all()
        
        total = sum(r[1] for r in resultados)
        
        incidentes_por_tipo = []
        for tipo, cantidad in resultados:
            porcentaje = (cantidad / total * 100) if total > 0 else 0
            incidentes_por_tipo.append(
                IncidentesPorTipo(
                    tipo=tipo,
                    cantidad=cantidad,
                    porcentaje=round(porcentaje, 2)
                )
            )
        
        return incidentes_por_tipo
    
    @staticmethod
    def obtener_talleres_eficientes(
        db: Session,
        limit: int = 10,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None
    ) -> List[EficienciaTaller]:
        """Ranking de talleres más eficientes"""
        
        talleres = db.query(Taller).filter(Taller.activo == True).all()
        
        resultados = []
        
        for taller in talleres:
            # Obtener asignaciones del taller
            query_asignaciones = db.query(AsignacionTaller).filter(
                AsignacionTaller.taller_id == taller.id
            )
            
            if fecha_inicio and fecha_fin:
                query_asignaciones = query_asignaciones.filter(
                    AsignacionTaller.fecha_asignacion.between(fecha_inicio, fecha_fin)
                )
            
            asignaciones = query_asignaciones.all()
            
            if not asignaciones:
                continue
            
            tiempos_respuesta = []
            tiempos_finalizacion = []
            incidentes_completados = 0
            
            for asignacion in asignaciones:
                incidente = db.query(Incidente).filter(
                    Incidente.id == asignacion.incidente_id
                ).first()
                
                if incidente and incidente.fecha_reporte:
                    # Tiempo de respuesta (asignación - reporte)
                    tiempo_respuesta = (asignacion.fecha_asignacion - incidente.fecha_reporte).total_seconds() / 60
                    tiempos_respuesta.append(tiempo_respuesta)
                    
                    # Tiempo de finalización
                    if incidente.estado == "resuelto" and incidente.fecha_resolucion:
                        tiempo_finalizacion = (incidente.fecha_resolucion - asignacion.fecha_asignacion).total_seconds() / 60
                        tiempos_finalizacion.append(tiempo_finalizacion)
                        incidentes_completados += 1
            
            tiempo_prom_respuesta = sum(tiempos_respuesta) / len(tiempos_respuesta) if tiempos_respuesta else 0
            tiempo_prom_finalizacion = sum(tiempos_finalizacion) / len(tiempos_finalizacion) if tiempos_finalizacion else 0
            
            # Score de eficiencia (menor tiempo = mejor)
            # Normalizar tiempos (invertir para que menor tiempo dé mayor score)
            max_tiempo_respuesta = 120  # 2 horas como referencia
            max_tiempo_finalizacion = 240  # 4 horas como referencia
            
            score_respuesta = max(0, 100 - (tiempo_prom_respuesta / max_tiempo_respuesta * 100)) if tiempo_prom_respuesta > 0 else 100
            score_finalizacion = max(0, 100 - (tiempo_prom_finalizacion / max_tiempo_finalizacion * 100)) if tiempo_prom_finalizacion > 0 else 100
            
            score_eficiencia = (score_respuesta * 0.6 + score_finalizacion * 0.4)  # 60% respuesta, 40% finalización
            
            # Obtener calificación promedio (si existe)
            calificacion_promedio = None  # Puedes agregar un modelo de calificaciones
            
            resultados.append(
                EficienciaTaller(
                    taller_id=taller.id,
                    nombre_taller=taller.nombre_comercial or taller.razon_social,
                    telefono=taller.telefono,
                    tiempo_promedio_respuesta_minutos=round(tiempo_prom_respuesta, 2),
                    tiempo_promedio_finalizacion_minutos=round(tiempo_prom_finalizacion, 2),
                    incidentes_atendidos=len(asignaciones),
                    calificacion_promedio=calificacion_promedio,
                    score_eficiencia=round(score_eficiencia, 2)
                )
            )
        
        # Ordenar por score de eficiencia (mayor a menor)
        resultados.sort(key=lambda x: x.score_eficiencia, reverse=True)
        
        return resultados[:limit]
    
    @staticmethod
    def obtener_tendencia_incidentes(
        db: Session,
        dias: int = 30
    ) -> List[Dict]:
        """Obtiene tendencia de incidentes por día"""
        
        fecha_inicio = datetime.now() - timedelta(days=dias)
        
        resultados = db.query(
            func.date(Incidente.fecha_reporte).label('fecha'),
            func.count(Incidente.id).label('cantidad')
        ).filter(
            Incidente.fecha_reporte >= fecha_inicio
        ).group_by(
            func.date(Incidente.fecha_reporte)
        ).order_by(
            func.date(Incidente.fecha_reporte)
        ).all()
        
        return [
            {
                "fecha": r[0].strftime("%Y-%m-%d"),
                "cantidad": r[1]
            }
            for r in resultados
        ]
    
    @staticmethod
    def obtener_distribucion_geografica(
        db: Session,
        fecha_inicio: datetime,
        fecha_fin: datetime
    ) -> List[Dict]:
        """Distribución de incidentes por ubicación"""
        
        resultados = db.query(
            Incidente.ciudad,
            func.count(Incidente.id).label('cantidad')
        ).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
            Incidente.ciudad.isnot(None)
        ).group_by(
            Incidente.ciudad
        ).order_by(
            func.count(Incidente.id).desc()
        ).limit(10).all()
        
        return [
            {
                "ciudad": r[0] or "No especificada",
                "cantidad": r[1]
            }
            for r in resultados
        ]
    
    @staticmethod
    def obtener_zonas_calientes(
        db: Session,
        fecha_inicio: datetime,
        fecha_fin: datetime,
        limit: int = 50
    ) -> List[IncidentesPorUbicacion]:
        """
        Obtiene las ubicaciones con más incidentes (mapa de calor)
        """
        
        resultados = db.query(
            Incidente.latitud,
            Incidente.longitud,
            Incidente.ciudad,
            Incidente.tipo_incidente,
            func.count(Incidente.id).label('cantidad')
        ).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
            Incidente.latitud.isnot(None),
            Incidente.longitud.isnot(None)
        ).group_by(
            Incidente.latitud,
            Incidente.longitud,
            Incidente.ciudad,
            Incidente.tipo_incidente
        ).order_by(
            func.count(Incidente.id).desc()
        ).limit(limit).all()
        
        return [
            IncidentesPorUbicacion(
                latitud=float(r[0]),
                longitud=float(r[1]),
                ciudad=r[2],
                tipo_incidente=r[3],
                cantidad=r[4]
            )
            for r in resultados
        ]
    
    @staticmethod
    def obtener_casos_cancelados(
        db: Session,
        fecha_inicio: datetime,
        fecha_fin: datetime
    ) -> CasosCancelados:
        """
        Obtiene estadísticas de casos cancelados o no atendidos
        """
        
        # Estados considerados como cancelados
        estados_cancelados = ['cancelado', 'no_atendido', 'rechazado', 'expirado']
        
        query_cancelados = db.query(Incidente).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
            Incidente.estado.in_(estados_cancelados)
        )
        
        total_cancelados = query_cancelados.count()
        
        # Total de incidentes en el período
        total_incidentes = db.query(Incidente).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin)
        ).count()
        
        porcentaje_cancelacion = (total_cancelados / total_incidentes * 100) if total_incidentes > 0 else 0
        
        # Motivos de cancelación (si tienes campo motivo_cancelacion)
        motivos = db.query(
            Incidente.motivo_cancelacion,
            func.count(Incidente.id)
        ).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
            Incidente.estado.in_(estados_cancelados)
        ).group_by(Incidente.motivo_cancelacion).all()
        
        motivos_dict = {r[0] or 'No especificado': r[1] for r in motivos}
        
        # Cancelados por estado
        estados_dict = {}
        for estado in estados_cancelados:
            count = db.query(Incidente).filter(
                Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
                Incidente.estado == estado
            ).count()
            if count > 0:
                estados_dict[estado] = count
        
        # Tendencia mensual de cancelaciones
        tendencia = []
        meses = db.query(
            func.date_trunc('month', Incidente.fecha_reporte).label('mes'),
            func.count(Incidente.id).label('cantidad')
        ).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
            Incidente.estado.in_(estados_cancelados)
        ).group_by('mes').order_by('mes').all()
        
        for mes in meses:
            tendencia.append({
                "mes": mes[0].strftime("%Y-%m"),
                "cantidad": mes[1]
            })
        
        return CasosCancelados(
            total_cancelados=total_cancelados,
            porcentaje_cancelacion=round(porcentaje_cancelacion, 2),
            motivos_cancelacion=motivos_dict,
            cancelados_por_estado=estados_dict,
            tendencia_mensual=tendencia
        )
    
    @staticmethod
    def obtener_cumplimiento_sla(
        db: Session,
        fecha_inicio: datetime,
        fecha_fin: datetime,
        sla_minutos: int = 30  # SLA esperado en minutos
    ) -> CumplimientoSLA:
        """
        Calcula el nivel de cumplimiento de SLA
        SLA = Tiempo desde reporte hasta asignación del taller
        """
        
        # Obtener incidentes con asignaciones
        incidentes_con_asignacion = db.query(
            Incidente.id,
            Incidente.fecha_reporte,
            AsignacionTaller.fecha_asignacion
        ).join(
            AsignacionTaller, Incidente.id == AsignacionTaller.incidente_id
        ).filter(
            Incidente.fecha_reporte.between(fecha_inicio, fecha_fin),
            Incidente.estado != 'cancelado'
        ).all()
        
        dentro_sla = 0
        fuera_sla = 0
        tiempos_respuesta = []
        
        for incidente in incidentes_con_asignacion:
            if incidente.fecha_reporte and incidente.fecha_asignacion:
                tiempo = (incidente.fecha_asignacion - incidente.fecha_reporte).total_seconds() / 60
                tiempos_respuesta.append(tiempo)
                
                if tiempo <= sla_minutos:
                    dentro_sla += 1
                else:
                    fuera_sla += 1
        
        total = dentro_sla + fuera_sla
        nivel_cumplimiento = (dentro_sla / total * 100) if total > 0 else 0
        
        # Distribución de tiempos
        distribucion = []
        rangos = [(0, 5), (5, 10), (10, 15), (15, 30), (30, 60), (60, 120), (120, float('inf'))]
        
        for rango_min, rango_max in rangos:
            if rango_max == float('inf'):
                count = sum(1 for t in tiempos_respuesta if t >= rango_min)
                label = f"{rango_min}+ min"
            else:
                count = sum(1 for t in tiempos_respuesta if rango_min <= t < rango_max)
                label = f"{rango_min}-{rango_max} min"
            
            if count > 0:
                distribucion.append({
                    "rango": label,
                    "cantidad": count,
                    "porcentaje": round((count / total * 100), 2) if total > 0 else 0
                })
        
        tiempo_promedio = sum(tiempos_respuesta) / len(tiempos_respuesta) if tiempos_respuesta else 0
        
        return CumplimientoSLA(
            nivel_cumplimiento_porcentaje=round(nivel_cumplimiento, 2),
            incidentes_dentro_sla=dentro_sla,
            incidentes_fuera_sla=fuera_sla,
            tiempo_promedio_respuesta_sla_minutos=round(tiempo_promedio, 2),
            tiempo_sla_esperado_minutos=sla_minutos,
            distribucion_tiempos=distribucion
        )
    
    @staticmethod
    def obtener_dashboard_completo(
        db: Session,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None
    ) -> DashboardAnaliticaResponse:
        """Obtiene todos los datos del dashboard de analítica"""
        
        if not fecha_inicio:
            fecha_fin = datetime.now()
            fecha_inicio = fecha_fin - timedelta(days=30)
        
        kpi_generales = AnaliticaService.calcular_kpi_asignacion(db, fecha_inicio, fecha_fin)
        incidentes_por_tipo = AnaliticaService.obtener_incidentes_por_tipo(db, fecha_inicio, fecha_fin)
        talleres_top = AnaliticaService.obtener_talleres_eficientes(db, 10, fecha_inicio, fecha_fin)
        tendencia = AnaliticaService.obtener_tendencia_incidentes(db, 30)
        distribucion_geografica = AnaliticaService.obtener_distribucion_geografica(db, fecha_inicio, fecha_fin)
        
        # 👇 Nuevos métodos
        zonas_calientes = AnaliticaService.obtener_zonas_calientes(db, fecha_inicio, fecha_fin)
        casos_cancelados = AnaliticaService.obtener_casos_cancelados(db, fecha_inicio, fecha_fin)
        cumplimiento_sla = AnaliticaService.obtener_cumplimiento_sla(db, fecha_inicio, fecha_fin, sla_minutos=30)
        
        return DashboardAnaliticaResponse(
            kpi_generales=kpi_generales,
            incidentes_por_tipo=incidentes_por_tipo,
            talleres_top_eficientes=talleres_top,
            tendencia_incidentes=tendencia,
            distribucion_geografica=distribucion_geografica,
            zonas_calientes=zonas_calientes,
            casos_cancelados=casos_cancelados,
            cumplimiento_sla=cumplimiento_sla
        )