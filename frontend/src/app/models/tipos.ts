export type Prioridad = 'alta' | 'media' | 'baja';

export interface TallerRespuesta {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  servicios: string[];
  activo: boolean;
  creado_en: string;
}

export interface TallerRegistroPayload {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  latitud: number;
  longitud: number;
  servicios?: string[];
  contrasena: string;
}

export interface TallerTokenRespuesta {
  token_acceso: string;
  tipo_token: string;
  taller: TallerRespuesta;
}

// ============================================================
// TÉCNICO - ACTUALIZADO con email y contraseña
// ============================================================

export interface TecnicoRespuesta {
  id: number;
  taller_id: number;
  nombre_completo: string;
  telefono: string | null;
  email: string | null;        // ← NUEVO
  especialidad: string | null;
  disponible: boolean;
  activo: boolean;
  creado_en: string;
}

export interface TecnicoCrearPayload {
  nombre_completo: string;
  email: string;               // ← NUEVO
  contrasena: string;          // ← NUEVO
  telefono?: string | null;
  especialidad?: string | null;
}

export interface TecnicoActualizarPayload {
  nombre_completo?: string;
  telefono?: string | null;
  especialidad?: string | null;
  activo?: boolean;
}

// ============================================================
// INCIDENTES
// ============================================================

export interface IncidentePanel {
  cliente: string;
  vehiculo: string;
  tipo: string;
  prioridad: Prioridad;
  espera: string;
}

export interface IndicadorPanel {
  titulo: string;
  valor: string;
  subtitulo: string;
  icono: string;
  color: string;
}

// ============================================================
// EVIDENCIAS E INCIDENTE COMPLETO
// ============================================================

export interface Evidencia {
  id: number;
  incidente_id: number;
  tipo: string;  // "imagen" o "audio"
  url_archivo: string;
  transcripcion_texto?: string;
  analisis_ia?: string;
  fecha_subida: string;
}

export interface VehiculoBasico {
  id: number;
  marca: string;
  modelo: string;
  placa: string;
  anio?: number;
  color?: string;
}

export interface ClienteBasico {
  id: number;
  nombre_completo: string;
  email: string;
  telefono?: string;
  creado_en: string;
}

export interface IncidenteCompleto {
  id: number;
  cliente_id: number;
  vehiculo_id: number;
  latitud: number;
  longitud: number;
  descripcion: string;
  prioridad: string;
  estado: string;
  clasificacion_ia?: string;
  resumen_ia?: string;
  transcripcion_audio?: string;
  creado_en: string;
  actualizado_en: string;
  vehiculo?: VehiculoBasico;
  cliente?: ClienteBasico;
  evidencias?: Evidencia[];
}