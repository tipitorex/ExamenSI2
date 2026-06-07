# CLAUDE.md - CeroEspera Emergency Vehicle Assistance Platform
Respondeme en español
## Project Overview

CeroEspera is a real-time vehicle emergency assistance platform connecting drivers with mechanical workshops. The system uses AI for incident classification (battery, flat tire, crash, engine, keys, tow truck) and audio transcription, with real-time tracking via WebSockets.

**Stack:** FastAPI (backend) + Angular (web) + Flutter (mobile) + PostgreSQL
FastAPI 0.116.1
SQLAlchemy 2.0.42 (ORM)
PostgreSQL (psycopg2-binary)
Python-Jose (JWT)
Passlib/Bcrypt (hashing)
Faster-Whisper (IA audio)
Firebase-Admin (FCM push)
Stripe (pagos)
Uvicorn (servidor)

Code Structure

Backend (backend/app/)
Directory	Purpose
api/v1/endpoints/	17 REST endpoints + WebSocket
core/	Settings, Firebase, Stripe, deps.py
db/	Database setup (base.py, session.py)
models/	14 SQLAlchemy models
schemas/	10 Pydantic schemas
services/	14 business logic services

Frontend (frontend/src/app/)
Directory	Purpose
components/	Reusable UI components
guards/	Route guards (super-admin)
layouts/	Main layout wrapper
models/	TypeScript interfaces
pages/	Dashboard, super-admin, landing, pricing
services/	13 API services


Mobile (mobile/lib/)
Directory	Purpose
core/	API config, theme
features/auth/	Login, register, welcome
features/incidents/	Report, tracking, history
features/tecnico/	Technician dashboard
features/pagos/	Invoices, payments
features/vehicles/	Vehicle CRUD
services/	WebSocket, push, OSRM


Flujo Principal Funcional

1. Cliente reporta incidente (texto + foto + audio + ubicación)
2. IA clasifica y genera resumen
3. Sistema asigna taller más cercano automáticamente
4. Taller recibe notificación push
5. Taller acepta y asigna técnico
6. Técnico actualiza ubicación vía WebSocket
7. Cliente ve tracking en tiempo real
8. Taller actualiza estado (en_camino → atencion → finalizado)
9. Sistema crea factura automática
10. Cliente paga vía Stripe

