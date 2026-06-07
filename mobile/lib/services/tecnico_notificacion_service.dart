import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/api_config.dart';

class TecnicoNotificacion {
  final int id;
  final int? incidenteId;
  final String tipo;
  final String titulo;
  final String mensaje;
  final bool leido;
  final DateTime fechaEnvio;

  TecnicoNotificacion({
    required this.id,
    this.incidenteId,
    required this.tipo,
    required this.titulo,
    required this.mensaje,
    required this.leido,
    required this.fechaEnvio,
  });

  factory TecnicoNotificacion.fromJson(Map<String, dynamic> json) {
    return TecnicoNotificacion(
      id: json['id'],
      incidenteId: json['incidente_id'],
      tipo: json['tipo'] ?? '',
      titulo: json['titulo'] ?? '',
      mensaje: json['mensaje'] ?? '',
      leido: json['leido'] ?? false,
      fechaEnvio: (DateTime.tryParse(json['fecha_envio'] ?? '') ?? DateTime.now()).toLocal(),
    );
  }
}

class TecnicoNotificacionService {
  static final TecnicoNotificacionService _instance =
      TecnicoNotificacionService._internal();
  factory TecnicoNotificacionService() => _instance;
  TecnicoNotificacionService._internal();

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('tecnico_token');
    final tipo = prefs.getString('tecnico_tipo_token') ?? 'bearer';
    final tipoFmt =
        tipo.isEmpty ? 'Bearer' : '${tipo[0].toUpperCase()}${tipo.substring(1).toLowerCase()}';
    return {
      'Content-Type': 'application/json',
      'Authorization': '$tipoFmt $token',
    };
  }

  Future<List<TecnicoNotificacion>> obtenerNotificaciones() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/notificaciones/tecnico'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((j) => TecnicoNotificacion.fromJson(j)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<void> marcarComoLeida(int notificacionId) async {
    try {
      final headers = await _getHeaders();
      await http.put(
        Uri.parse('${ApiConfig.baseUrl}/notificaciones/$notificacionId/marcar-leida'),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: jsonEncode({'leido': true}),
      );
    } catch (_) {}
  }

  int cantidadNoLeidas(List<TecnicoNotificacion> notifs) =>
      notifs.where((n) => !n.leido).length;
}
