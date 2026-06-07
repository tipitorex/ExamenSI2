"""
Script de migración: agrega columnas a taller_servicios y crea tabla cotizaciones.
Ejecutar UNA sola vez: python scripts/migrar_cotizaciones.py
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from sqlalchemy import text


MIGRACIONES = [
    # 1. Columnas nuevas en taller_servicios
    {
        "descripcion": "Agregar columna 'descripcion' a taller_servicios",
        "check": "SELECT 1 FROM information_schema.columns WHERE table_name='taller_servicios' AND column_name='descripcion'",
        "sql": "ALTER TABLE taller_servicios ADD COLUMN descripcion TEXT",
    },
    {
        "descripcion": "Agregar columna 'precio_base' a taller_servicios",
        "check": "SELECT 1 FROM information_schema.columns WHERE table_name='taller_servicios' AND column_name='precio_base'",
        "sql": "ALTER TABLE taller_servicios ADD COLUMN precio_base DOUBLE PRECISION",
    },
    {
        "descripcion": "Agregar columna 'tiempo_estimado_minutos' a taller_servicios",
        "check": "SELECT 1 FROM information_schema.columns WHERE table_name='taller_servicios' AND column_name='tiempo_estimado_minutos'",
        "sql": "ALTER TABLE taller_servicios ADD COLUMN tiempo_estimado_minutos INTEGER",
    },
    # 2. Tabla cotizaciones (si no existe ya)
    {
        "descripcion": "Crear tabla 'cotizaciones'",
        "check": "SELECT 1 FROM information_schema.tables WHERE table_name='cotizaciones'",
        "sql": """
            CREATE TABLE cotizaciones (
                id SERIAL PRIMARY KEY,
                incidente_id INTEGER NOT NULL REFERENCES incidentes(id) ON DELETE CASCADE,
                taller_id INTEGER NOT NULL REFERENCES talleres(id) ON DELETE CASCADE,
                monto_total DOUBLE PRECISION NOT NULL,
                tiempo_estimado_reparacion_minutos INTEGER NOT NULL,
                detalles_servicio TEXT,
                notas TEXT,
                estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """,
    },
    {
        "descripcion": "Crear índice en cotizaciones.incidente_id",
        "check": "SELECT 1 FROM pg_indexes WHERE indexname='ix_cotizaciones_incidente_id'",
        "sql": "CREATE INDEX ix_cotizaciones_incidente_id ON cotizaciones (incidente_id)",
    },
    {
        "descripcion": "Crear índice en cotizaciones.taller_id",
        "check": "SELECT 1 FROM pg_indexes WHERE indexname='ix_cotizaciones_taller_id'",
        "sql": "CREATE INDEX ix_cotizaciones_taller_id ON cotizaciones (taller_id)",
    },
    {
        "descripcion": "Crear índice en cotizaciones.estado",
        "check": "SELECT 1 FROM pg_indexes WHERE indexname='ix_cotizaciones_estado'",
        "sql": "CREATE INDEX ix_cotizaciones_estado ON cotizaciones (estado)",
    },
]


def ejecutar_migraciones():
    with engine.connect() as conn:
        for m in MIGRACIONES:
            resultado = conn.execute(text(m["check"])).fetchone()
            if resultado:
                print(f"  ✓ Ya existe: {m['descripcion']}")
            else:
                print(f"  → Aplicando: {m['descripcion']}")
                conn.execute(text(m["sql"]))
                conn.commit()
                print(f"    ✅ Listo")

    print("\n✅ Migración completada.")


if __name__ == "__main__":
    print("🔄 Iniciando migración...\n")
    ejecutar_migraciones()
