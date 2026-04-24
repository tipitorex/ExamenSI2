import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';

class IncidenteApiService {
  IncidenteApiService._();

  static final IncidenteApiService instance = IncidenteApiService._();

  final http.Client _client = http.Client();

  /// Reporta un incidente y retorna el análisis de IA
  Future<Map<String, dynamic>> reportarIncidente({
    required int vehiculoId,
    required double latitud,
    required double longitud,
    required String descripcion,
    String prioridad = 'media',
    String? audioPath,
    File? imagenFrontal,
    List<File> imagenesAdicionales = const [],
  }) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final request = http.MultipartRequest('POST', uri);
    headers.remove('Content-Type');
    request.headers.addAll(headers);

    request.fields['vehiculo_id'] = vehiculoId.toString();
    request.fields['latitud'] = latitud.toString();
    request.fields['longitud'] = longitud.toString();
    request.fields['descripcion'] = descripcion.trim();
    request.fields['prioridad'] = prioridad;

    if (imagenFrontal != null) {
      request.files.add(
        await http.MultipartFile.fromPath('imagen_frontal', imagenFrontal.path),
      );
    }

    for (int i = 0; i < imagenesAdicionales.length; i++) {
      final file = imagenesAdicionales[i];
      request.files.add(
        await http.MultipartFile.fromPath('imagenes_adicionales', file.path),
      );
    }

    if (audioPath != null && audioPath.isNotEmpty) {
      final audioFile = File(audioPath);
      if (await audioFile.exists()) {
        request.files.add(
          await http.MultipartFile.fromPath('audio', audioPath),
        );
      }
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    final body = _decodeBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        _extractError(body, 'No se pudo reportar el incidente.'),
      );
    }

    final data = body as Map<String, dynamic>;

    return {
      'id': data['id'],
      'clasificacion_ia': data['clasificacion_ia'] ?? 'incierto',
      'prioridad': data['prioridad'] ?? 'media',
      'resumen_ia': data['resumen_ia'] ?? 'Incidente registrado',
      'mensaje': data['mensaje'] ?? 'Incidente reportado correctamente',
    };
  }

  // ============================================================
  // MÉTODOS PARA HISTORIAL
  // ============================================================

  /// Obtiene todos los incidentes del cliente autenticado
  Future<List<Map<String, dynamic>>> getMisIncidentes() async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final response = await _client.get(uri, headers: headers);

    print("📡 getMisIncidentes - Status: ${response.statusCode}");
    print("📡 getMisIncidentes - Body: ${response.body}");

    final body = _decodeBody(response.body);

    if (response.statusCode == 200) {
      // Si es null o no es lista, devolver lista vacía
      if (body == null) {
        return [];
      }
      if (body is List) {
        return body.cast<Map<String, dynamic>>();
      }
      return [];
    } else if (response.statusCode == 401) {
      throw AuthApiException('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      throw AuthApiException(
        _extractError(body, 'Error al cargar incidentes.'),
      );
    }
  }

  /// Obtiene el detalle de un incidente específico (usando endpoint de cliente)
  Future<Map<String, dynamic>> getIncidenteDetalle(int incidenteId) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse(
      '${ApiConfig.baseUrl}/incidentes/cliente/$incidenteId',
    );

    print("📡 getIncidenteDetalle - URL: $uri");

    final response = await _client.get(uri, headers: headers);

    print("📡 getIncidenteDetalle - Status: ${response.statusCode}");
    print("📡 getIncidenteDetalle - Body: ${response.body}");

    final body = _decodeBody(response.body);

    if (response.statusCode == 200) {
      return body as Map<String, dynamic>;
    } else if (response.statusCode == 401) {
      throw AuthApiException('Sesión expirada. Inicia sesión nuevamente.');
    } else if (response.statusCode == 404) {
      throw AuthApiException('Incidente no encontrado.');
    } else {
      throw AuthApiException(
        _extractError(body, 'Error al cargar detalle del incidente.'),
      );
    }
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
