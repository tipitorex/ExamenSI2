class IncidentModel {
  final int id;
  final int clienteId;
  final int vehiculoId;
  final double latitud;
  final double longitud;
  final String descripcion;
  final String? resumenIa;
  final String? clasificacionIa;
  final String prioridad;
  final String estado;
  final String? direccionTexto;
  final DateTime creadoEn;
  final DateTime? actualizadoEn;
  final DateTime? fechaAtencion;
  final DateTime? fechaFinalizacion;

  IncidentModel({
    required this.id,
    required this.clienteId,
    required this.vehiculoId,
    required this.latitud,
    required this.longitud,
    required this.descripcion,
    this.resumenIa,
    this.clasificacionIa,
    required this.prioridad,
    required this.estado,
    this.direccionTexto,
    required this.creadoEn,
    this.actualizadoEn,
    this.fechaAtencion,
    this.fechaFinalizacion,
  });

  factory IncidentModel.fromJson(Map<String, dynamic> json) {
    return IncidentModel(
      id: json['id'] ?? 0,
      clienteId: json['cliente_id'] ?? 0,
      vehiculoId: json['vehiculo_id'] ?? 0,
      latitud: (json['latitud'] ?? 0).toDouble(),
      longitud: (json['longitud'] ?? 0).toDouble(),
      descripcion: json['descripcion'] ?? '',
      resumenIa: json['resumen_ia'],
      clasificacionIa: json['clasificacion_ia'],
      prioridad: json['prioridad'] ?? 'media',
      estado: json['estado'] ?? 'pendiente',
      direccionTexto: json['direccion_texto'],
      creadoEn: DateTime.parse(json['creado_en']),
      actualizadoEn: json['actualizado_en'] != null
          ? DateTime.parse(json['actualizado_en'])
          : null,
      fechaAtencion: json['fecha_atencion'] != null
          ? DateTime.parse(json['fecha_atencion'])
          : null,
      fechaFinalizacion: json['fecha_finalizacion'] != null
          ? DateTime.parse(json['fecha_finalizacion'])
          : null,
    );
  }

  bool get isPendiente => estado == 'pendiente';
  bool get isEnProceso => estado == 'en_proceso';
  bool get isAtendido => estado == 'atendido';
  bool get isCancelado => estado == 'cancelado';

  String get estadoTexto {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En Proceso';
      case 'atendido':
        return 'Atendido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  String get prioridadTexto {
    switch (prioridad) {
      case 'alta':
        return 'Alta';
      case 'media':
        return 'Media';
      case 'baja':
        return 'Baja';
      default:
        return prioridad;
    }
  }
}
