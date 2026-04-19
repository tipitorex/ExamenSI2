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
    headers.remove(
      'Content-Type',
    ); // MultipartRequest maneja su propio content-type
    request.headers.addAll(headers);

    // Campos de texto
    request.fields['vehiculo_id'] = vehiculoId.toString();
    request.fields['latitud'] = latitud.toString();
    request.fields['longitud'] = longitud.toString();
    request.fields['descripcion'] = descripcion.trim();
    request.fields['prioridad'] = prioridad;

    // Imagen frontal (obligatoria según UI)
    if (imagenFrontal != null) {
      request.files.add(
        await http.MultipartFile.fromPath('imagen_frontal', imagenFrontal.path),
      );
    }

    // Imágenes adicionales
    for (int i = 0; i < imagenesAdicionales.length; i++) {
      final file = imagenesAdicionales[i];
      request.files.add(
        await http.MultipartFile.fromPath('imagenes_adicionales', file.path),
      );
    }

    // Audio
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

    // Retornar el análisis completo de IA
    return {
      'id': data['id'],
      'clasificacion_ia': data['clasificacion_ia'] ?? 'incierto',
      'prioridad': data['prioridad'] ?? 'media',
      'resumen_ia': data['resumen_ia'] ?? 'Incidente registrado',
      'mensaje': data['mensaje'] ?? 'Incidente reportado correctamente',
    };
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
