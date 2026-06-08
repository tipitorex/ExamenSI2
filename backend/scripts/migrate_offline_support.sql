-- Migración: soporte modo offline
-- Agrega client_request_id a incidentes para idempotencia en sincronización

ALTER TABLE incidentes
  ADD COLUMN IF NOT EXISTS client_request_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS ix_incidentes_client_request_id
  ON incidentes (client_request_id)
  WHERE client_request_id IS NOT NULL;
