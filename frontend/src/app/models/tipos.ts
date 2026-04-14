export type Prioridad = 'alta' | 'media' | 'baja';

export interface TallerRespuesta {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  servicios: string[];
  activo: boolean;
  creado_en: string;
}

export interface TallerRegistroPayload {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  servicios?: string[];
  contrasena: string;
}

export interface TallerTokenRespuesta {
  token_acceso: string;
  tipo_token: string;
  taller: TallerRespuesta;
}

export interface TecnicoRespuesta {
  id: number;
  taller_id: number;
  nombre_completo: string;
  telefono: string | null;
  especialidad: string | null;
  disponible: boolean;
  activo: boolean;
  creado_en: string;
}

export interface TecnicoCrearPayload {
  nombre_completo: string;
  telefono?: string | null;
  especialidad?: string | null;
}

export interface TecnicoActualizarPayload {
  nombre_completo?: string;
  telefono?: string | null;
  especialidad?: string | null;
  activo?: boolean;
}

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
