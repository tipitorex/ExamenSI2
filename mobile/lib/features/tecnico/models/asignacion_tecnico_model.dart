import 'package:flutter/material.dart';

class AsignacionTecnico {
  final int id;
  final int incidenteId;
  final int tallerId;
  final int? tecnicoId;
  final String estado;
  final String clienteNombre;
  final String clienteTelefono;
  final String descripcion;
  final double latitud;
  final double longitud;
  final String direccion;
  final int? tiempoEstimado;
  final String clasificacion;
  final String prioridad;

  AsignacionTecnico({
    required this.id,
    required this.incidenteId,
    required this.tallerId,
    this.tecnicoId,
    required this.estado,
    required this.clienteNombre,
    required this.clienteTelefono,
    required this.descripcion,
    required this.latitud,
    required this.longitud,
    required this.direccion,
    this.tiempoEstimado,
    required this.clasificacion,
    required this.prioridad,
  });

  factory AsignacionTecnico.fromJson(Map<String, dynamic> json) {
    return AsignacionTecnico(
      id: json['id'],
      incidenteId: json['incidente_id'],
      tallerId: json['taller_id'],
      tecnicoId: json['tecnico_id'],
      estado: json['estado'] ?? 'pendiente',
      clienteNombre:
          json['cliente_nombre'] ??
          json['cliente']?['nombre_completo'] ??
          'Cliente',
      clienteTelefono:
          json['cliente_telefono'] ?? json['cliente']?['telefono'] ?? '',
      descripcion: json['descripcion'] ?? '',
      latitud: json['latitud']?.toDouble() ?? 0.0,
      longitud: json['longitud']?.toDouble() ?? 0.0,
      direccion: json['direccion'] ?? '',
      tiempoEstimado: json['tiempo_estimado'],
      clasificacion: json['clasificacion_ia'] ?? 'General',
      prioridad: json['prioridad'] ?? 'media',
    );
  }

  String get estadoTexto {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'taller_asignado':
        return 'Asignado';
      case 'en_camino':
        return 'En camino';
      case 'atencion':
      case 'en_atencion':
        return 'En atención';
      case 'finalizado':
        return 'Finalizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  }

  Color get estadoColor {
    switch (estado) {
      case 'pendiente':
        return Colors.orange;
      case 'taller_asignado':
        return Colors.teal;
      case 'en_camino':
        return Colors.blue;
      case 'atencion':
      case 'en_atencion':
        return Colors.green;
      case 'finalizado':
        return Colors.grey;
      case 'cancelado':
        return Colors.red;
      default:
        return Colors.grey;
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

  Color get prioridadColor {
    switch (prioridad) {
      case 'alta':
        return Colors.red;
      case 'media':
        return Colors.orange;
      case 'baja':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }
}
