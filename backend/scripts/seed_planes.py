#!/usr/bin/env python3
"""
Script para insertar los planes de suscripción en la base de datos.
Ejecutar: docker compose exec backend python -m scripts.seed_planes
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.settings import settings


def seed_planes():
    # Conexión directa sin usar los modelos
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        try:
            # Verificar si ya existen planes
            result = conn.execute(text("SELECT COUNT(*) FROM planes_suscripcion"))
            count = result.scalar()
            
            if count > 0:
                print(f"⚠️ Ya existen {count} planes en la base de datos.")
                respuesta = input("¿Deseas recrearlos? (s/n): ")
                if respuesta.lower() != 's':
                    print("Cancelando...")
                    return
                # Eliminar planes existentes
                conn.execute(text("DELETE FROM planes_suscripcion"))
                # Resetear plan_id en talleres
                conn.execute(text("UPDATE talleres SET plan_id = NULL"))
                conn.commit()
                print("✅ Planes anteriores eliminados")
            
            # Insertar plan GRATUITO
            conn.execute(text("""
                INSERT INTO planes_suscripcion (
                    nombre, 
                    descripcion, 
                    precio_mensual, 
                    precio_anual, 
                    limite_tecnicos, 
                    limite_incidentes_mensual, 
                    caracteristicas, 
                    activo, 
                    creado_en
                ) VALUES (
                    'gratuito',
                    'Plan básico gratuito para talleres que están comenzando',
                    0,
                    0,
                    2,
                    10,
                    '{"diagnostico_ia": true, "tracking_tiempo_real": true, "reportes_avanzados": false, "soporte_prioritario": false, "soporte": "estándar"}',
                    true,
                    NOW()
                )
            """))
            
            # Insertar plan PREMIUM
            conn.execute(text("""
                INSERT INTO planes_suscripcion (
                    nombre, 
                    descripcion, 
                    precio_mensual, 
                    precio_anual, 
                    limite_tecnicos, 
                    limite_incidentes_mensual, 
                    caracteristicas, 
                    activo, 
                    creado_en
                ) VALUES (
                    'premium',
                    'Plan profesional con técnicos ilimitados e incidentes ilimitados',
                    29.00,
                    290.00,
                    999,
                    999,
                    '{"diagnostico_ia": true, "tracking_tiempo_real": true, "reportes_avanzados": true, "soporte_prioritario": true, "soporte": "24/7 prioritario"}',
                    true,
                    NOW()
                )
            """))
            
            conn.commit()
            
            # Verificar resultados
            result = conn.execute(text("SELECT id, nombre, precio_mensual FROM planes_suscripcion"))
            planes = result.fetchall()
            
            print("✅ Planes creados exitosamente:")
            for plan in planes:
                print(f"   - {plan[1]} (ID: {plan[0]}) - ${plan[2]}/mes")
            
            # Asignar plan gratuito a talleres existentes sin plan
            result = conn.execute(text("""
                UPDATE talleres 
                SET plan_id = (SELECT id FROM planes_suscripcion WHERE nombre = 'gratuito') 
                WHERE plan_id IS NULL
                RETURNING id
            """))
            actualizados = result.rowcount
            conn.commit()
            
            if actualizados > 0:
                print(f"✅ Plan gratuito asignado a {actualizados} talleres existentes")
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error: {e}")
            raise


if __name__ == "__main__":
    print("🚀 Insertando planes de suscripción...")
    seed_planes()