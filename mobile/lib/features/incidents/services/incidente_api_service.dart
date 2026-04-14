import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';

class IncidenteApiService {
  IncidenteApiService._();

  static final IncidenteApiService instance = IncidenteApiService._();

  final http.Client _client = http.Client();

  Future<int> reportarIncidente({
    required int vehiculoId,
    required double latitud,
    required double longitud,
    required String descripcion,
    String prioridad = 'media',
  }) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/incidentes'),
      headers: {...headers, 'Content-Type': 'application/json'},
      body: jsonEncode({
        'vehiculo_id': vehiculoId,
        'latitud': latitud,
        'longitud': longitud,
        'descripcion': descripcion.trim(),
        'prioridad': prioridad,
      }),
    );

    final body = _decodeBody(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        _extractError(body, 'No se pudo reportar el incidente.'),
      );
    }

    return (body as Map<String, dynamic>)['id'] as int;
  }

  dynamic _decodeBody(String rawBody) {
    if (rawBody.isEmpty) {
      return <String, dynamic>{};
    }
    return jsonDecode(rawBody);
  }

  String _extractError(dynamic body, String fallback) {
    if (body is Map<String, dynamic>) {
      final detail = body['detail'];
      if (detail is String) {
        return detail;
      }
      if (detail is List && detail.isNotEmpty) {
        final first = detail.first;
        if (first is Map<String, dynamic> && first['msg'] is String) {
          return first['msg'] as String;
        }
      }
    }
    return fallback;
  }
}
