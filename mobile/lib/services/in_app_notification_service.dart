import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/api_config.dart';
import '../features/auth/services/auth_api_service.dart';

class InAppNotification {
  final int id;
  final int? clienteId;
  final int? tallerId;
  final int? incidenteId;
  final String tipo;
  final String titulo;
  final String mensaje;
  final bool leido;
  final DateTime fechaEnvio;
  final Map<String, dynamic>? datosExtra;

  InAppNotification({
    required this.id,
    this.clienteId,
    this.tallerId,
    this.incidenteId,
    required this.tipo,
    required this.titulo,
    required this.mensaje,
    required this.leido,
    required this.fechaEnvio,
    this.datosExtra,
  });

  factory InAppNotification.fromJson(Map<String, dynamic> json) {
    return InAppNotification(
      id: json['id'],
      clienteId: json['cliente_id'],
      tallerId: json['taller_id'],
      incidenteId: json['incidente_id'],
      tipo: json['tipo'],
      titulo: json['titulo'],
      mensaje: json['mensaje'],
      leido: json['leido'],
      fechaEnvio: DateTime.parse(json['fecha_envio']),
      datosExtra: json['datos_extra_json'] != null
          ? jsonDecode(json['datos_extra_json'])
          : null,
    );
  }
}

class InAppNotificationService {
  static final InAppNotificationService _instance =
      InAppNotificationService._internal();
  factory InAppNotificationService() => _instance;
  InAppNotificationService._internal();

  Future<List<InAppNotification>> obtenerNotificaciones() async {
    try {
      final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/notificaciones/cliente'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => InAppNotification.fromJson(json)).toList();
      } else {
        print('❌ Error obteniendo notificaciones: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('❌ Error de red: $e');
      return [];
    }
  }

  Future<void> marcarComoLeida(int notificacionId) async {
    try {
      final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

      await http.put(
        Uri.parse(
          '${ApiConfig.baseUrl}/notificaciones/$notificacionId/marcar-leida',
        ),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: jsonEncode({'leido': true}),
      );
    } catch (e) {
      print('❌ Error marcando notificación como leída: $e');
    }
  }

  Future<void> eliminarNotificacion(int notificacionId) async {
    try {
      final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

      await http.delete(
        Uri.parse('${ApiConfig.baseUrl}/notificaciones/$notificacionId'),
        headers: headers,
      );
    } catch (e) {
      print('❌ Error eliminando notificación: $e');
    }
  }

  int getCantidadNoLeidas(List<InAppNotification> notificaciones) {
    return notificaciones.where((n) => !n.leido).length;
  }
}
