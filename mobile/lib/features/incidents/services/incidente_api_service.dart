import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart'; // ← AuthApiException viene de AQUÍ

// ============================================================
// EXCEPCIÓN PERSONALIZADA PARA INCIDENTE INCOMPLETO (SOLO ESTA)
// ============================================================

class IncidenteIncompletoException implements Exception {
  final int codigo;
  final String mensaje;

  IncidenteIncompletoException({required this.codigo, required this.mensaje});

  @override
  String toString() => mensaje;
}

// ============================================================
// SERVICIO PRINCIPAL
// ============================================================

class IncidenteApiService {
  IncidenteApiService._();

  static final IncidenteApiService instance = IncidenteApiService._();

  final http.Client _client = http.Client();

  /// Valida localmente si se ha proporcionado al menos un medio de descripción
  bool validarCamposLocalmente({
    String? descripcion,
    String? audioPath,
    File? imagenFrontal,
    List<File> imagenesAdicionales = const [],
  }) {
    final tieneTexto = descripcion != null && descripcion.trim().isNotEmpty;
    final tieneAudio = audioPath != null && audioPath.isNotEmpty;
    final tieneFoto =
        imagenFrontal != null ||
        (imagenesAdicionales.isNotEmpty &&
            imagenesAdicionales.any((img) => img != null));

    return tieneTexto || tieneAudio || tieneFoto;
  }

  /// Reporta un incidente y retorna el análisis de IA
  /// [descripcion] es OPCIONAL - puede ser null si se envía audio o foto
  Future<Map<String, dynamic>> reportarIncidente({
    required int vehiculoId,
    required double latitud,
    required double longitud,
    String? descripcion,
    String prioridad = 'media',
    String? audioPath,
    File? imagenFrontal,
    List<File> imagenesAdicionales = const [],
  }) async {
    // VALIDACIÓN LOCAL
    if (!validarCamposLocalmente(
      descripcion: descripcion,
      audioPath: audioPath,
      imagenFrontal: imagenFrontal,
      imagenesAdicionales: imagenesAdicionales,
    )) {
      throw IncidenteIncompletoException(
        codigo: 400,
        mensaje:
            'Debes proporcionar al menos una forma de describir el incidente: texto, audio o foto(s)',
      );
    }

    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final request = http.MultipartRequest('POST', uri);
    headers.remove('Content-Type');
    request.headers.addAll(headers);

    request.fields['vehiculo_id'] = vehiculoId.toString();
    request.fields['latitud'] = latitud.toString();
    request.fields['longitud'] = longitud.toString();
    request.fields['prioridad'] = prioridad;

    if (descripcion != null && descripcion.trim().isNotEmpty) {
      request.fields['descripcion'] = descripcion.trim();
    }

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
      final errorMensaje = _extractError(
        body,
        'No se pudo reportar el incidente.',
      );

      if (response.statusCode == 400) {
        throw IncidenteIncompletoException(codigo: 400, mensaje: errorMensaje);
      }

      throw AuthApiException(errorMensaje); // ← Esta clase viene del import
    }

    final data = body as Map<String, dynamic>;

    return {
      'id': data['id'],
      'clasificacion_ia': data['clasificacion_ia'] ?? 'incierto',
      'prioridad': data['prioridad'] ?? 'media',
      'resumen_ia': data['resumen_ia'] ?? 'Incidente registrado',
      'transcripcion_audio': data['transcripcion_audio'],
      'mensaje': data['mensaje'] ?? 'Incidente reportado correctamente',
    };
  }

  // ============================================================
  // MÉTODOS PARA HISTORIAL
  // ============================================================

  Future<List<Map<String, dynamic>>> getMisIncidentes() async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final response = await _client.get(uri, headers: headers);

    print("📡 getMisIncidentes - Status: ${response.statusCode}");
    print("📡 getMisIncidentes - Body: ${response.body}");

    final body = _decodeBody(response.body);

    if (response.statusCode == 200) {
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

  Future<Map<String, dynamic>?> getIncidenteActivo() async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final response = await _client.get(uri, headers: headers);

    print("📡 getIncidenteActivo - Status: ${response.statusCode}");
    print("📡 getIncidenteActivo - Body: ${response.body}");

    if (response.statusCode == 200) {
      final List<dynamic> incidentes = _decodeBody(response.body);

      for (var inc in incidentes) {
        final estado = inc['estado'];
        if (estado == 'pendiente' || estado == 'en_proceso') {
          print(
            "📡 getIncidenteActivo - Incidente activo encontrado: ${inc['id']}",
          );
          return await getIncidenteDetalle(inc['id']);
        }
      }
      print("📡 getIncidenteActivo - No hay incidentes activos");
      return null;
    } else if (response.statusCode == 401) {
      throw AuthApiException('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      throw AuthApiException(
        _extractError(
          _decodeBody(response.body),
          'Error al cargar incidente activo.',
        ),
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
