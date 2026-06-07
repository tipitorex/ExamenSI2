#!/usr/bin/env python3
"""
Seed para crear Super Admin por defecto (sin usar modelos).
Ejecutar: docker compose exec backend python scripts/super_admin_seed.py
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.settings import settings
import psycopg2
from passlib.context import CryptContext
from urllib.parse import urlparse

# Contexto para hashear contraseña
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def obtener_hash_contrasena(contrasena: str) -> str:
    return pwd_context.hash(contrasena)


def get_psycopg2_url():
    """Convierte la URL de SQLAlchemy a formato psycopg2"""
    url = settings.database_url
    # Remover 'postgresql+psycopg2://' -> 'postgresql://'
    if '+psycopg2' in url:
        url = url.replace('+psycopg2', '')
    return url


def seed_super_admin():
    # Obtener URL en formato correcto para psycopg2
    db_url = get_psycopg2_url()
    print(f"Conectando a: {db_url.replace('emergencias_pass', '****')}")
    
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    try:
        # Verificar si la tabla existe, si no, crearla
        cur.execute("""
            CREATE TABLE IF NOT EXISTS super_admin (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                contrasena_hash VARCHAR(255) NOT NULL,
                creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        conn.commit()
        
        # Verificar si ya existe el super admin
        cur.execute("SELECT id FROM super_admin WHERE email = 'admin@gmail.com'")
        existe = cur.fetchone()
        
        if not existe:
            hashed_password = obtener_hash_contrasena('admin123')
            cur.execute("""
                INSERT INTO super_admin (email, contrasena_hash)
                VALUES (%s, %s)
            """, ('admin@gmail.com', hashed_password))
            conn.commit()
            print('✅ Super Admin creado exitosamente!')
            print('   Email: admin@gmail.com')
            print('   Contraseña: admin123')
        else:
            print('⚠️ Super Admin ya existe')
            
    except Exception as e:
        print(f'❌ Error: {e}')
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_super_admin()