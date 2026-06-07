import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';

// ============================================================
// EXCEPCIÓN PERSONALIZADA
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

  /// Estados que se consideran "activos" (no finalizados)
  static const List<String> estadosActivos = [
    'pendiente',
    'taller_asignado',
    'en_camino',
    'en_proceso',
    'atencion',
  ];

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

  /// Reporta un incidente
  Future<Map<String, dynamic>> reportarIncidente({
    required int vehiculoId,
    required double latitud,
    required double longitud,
    String? descripcion,
    String prioridad = 'media',
    String? syncId,
    String? audioPath,
    File? imagenFrontal,
    List<File> imagenesAdicionales = const [],
  }) async {
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
    if (syncId != null) {
  request.fields['sync_id'] = syncId;
}

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

      throw AuthApiException(errorMensaje);
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

  /// Obtener todos los incidentes del cliente
  Future<List<Map<String, dynamic>>> getMisIncidentes() async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final response = await _client.get(uri, headers: headers);

    final body = _decodeBody(response.body);

    if (response.statusCode == 200) {
      if (body == null) return [];
      if (body is List) return body.cast<Map<String, dynamic>>();
      return [];
    } else if (response.statusCode == 401) {
      throw AuthApiException('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      throw AuthApiException(
        _extractError(body, 'Error al cargar incidentes.'),
      );
    }
  }

  /// Obtener detalle de un incidente específico
  Future<Map<String, dynamic>> getIncidenteDetalle(int incidenteId) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse(
      '${ApiConfig.baseUrl}/incidentes/cliente/$incidenteId',
    );

    final response = await _client.get(uri, headers: headers);

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

  /// Cancelar un incidente (cliente)
  Future<void> cancelarIncidente(int incidenteId) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes/$incidenteId');

    final response = await _client.patch(
      uri,
      headers: {...headers, 'Content-Type': 'application/json'},
      body: jsonEncode({'estado': 'cancelado'}),
    );

    final body = _decodeBody(response.body);

    if (response.statusCode != 200) {
      throw AuthApiException(_extractError(body, 'Error al cancelar incidente.'));
    }
  }

  /// Obtener incidente activo (usando el nuevo endpoint /cliente/activo)
  /// Estados activos: pendiente, taller_asignado, en_camino, en_proceso, atencion
  Future<Map<String, dynamic>?> getIncidenteActivo() async {
    try {
      final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
      final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes/cliente/activo');

      final response = await _client.get(uri, headers: headers);

      if (response.statusCode == 200) {
        final data = _decodeBody(response.body);
        return data as Map<String, dynamic>;
      } else if (response.statusCode == 404) {
        return null;
      } else if (response.statusCode == 401) {
        throw AuthApiException('Sesión expirada. Inicia sesión nuevamente.');
      } else {
        print('Error getIncidenteActivo: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('❌ Error getIncidenteActivo: $e');
      return null;
    }
  }

  /// Obtener distancia entre dos puntos (Haversine)
  static double calcularDistancia(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const double R = 6371;
    final dLat = _toRadians(lat2 - lat1);
    final dLng = _toRadians(lng2 - lng1);
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) *
            math.cos(_toRadians(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  static double _toRadians(double degrees) => degrees * math.pi / 180;

  /// Calcular tiempo estimado basado en distancia (2 min por km)
  static int calcularTiempoEstimado(double distanciaKm) {
    final minutos = (distanciaKm * 2).ceil();
    return minutos < 1 ? 1 : minutos;
  }

  /// Verificar si hay un incidente activo (sin cargar todo el detalle)
  Future<bool> hasIncidenteActivo() async {
    try {
      final incidente = await getIncidenteActivo();
      return incidente != null;
    } catch (e) {
      return false;
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

    /// Sincroniza un incidente que estaba pendiente (offline).
  /// Retorna la respuesta del backend o lanza excepción en caso de error.
  Future<Map<String, dynamic>> sincronizarIncidentePendiente({
    required String syncId,
    required int vehiculoId,
    required double latitud,
    required double longitud,
    String? descripcion,
    String prioridad = 'media',
    String? imagenFrontalPath,
    List<String> imagenesAdicionalesPaths = const [],
    String? audioPath,
  }) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');

    final request = http.MultipartRequest('POST', uri);
    headers.remove('Content-Type');
    request.headers.addAll(headers);

    // Campos básicos
    request.fields['vehiculo_id'] = vehiculoId.toString();
    request.fields['latitud'] = latitud.toString();
    request.fields['longitud'] = longitud.toString();
    request.fields['prioridad'] = prioridad;
    request.fields['sync_id'] = syncId; // <-- CLAVE para idempotencia

    if (descripcion != null && descripcion.trim().isNotEmpty) {
      request.fields['descripcion'] = descripcion.trim();
    }

    // Adjuntar archivos si existen en las rutas dadas
    if (imagenFrontalPath != null) {
      final file = File(imagenFrontalPath);
      if (await file.exists()) {
        request.files.add(
          await http.MultipartFile.fromPath('imagen_frontal', imagenFrontalPath),
        );
      }
    }

    for (final path in imagenesAdicionalesPaths) {
      final file = File(path);
      if (await file.exists()) {
        request.files.add(
          await http.MultipartFile.fromPath('imagenes_adicionales', path),
        );
      }
    }

    if (audioPath != null) {
      final file = File(audioPath);
      if (await file.exists()) {
        request.files.add(
          await http.MultipartFile.fromPath('audio', audioPath),
        );
      }
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    final body = _decodeBody(response.body);

    // Consider 2xx responses as success. Also treat 409 (conflict / already exists)
    // as success for idempotent sync (backend may respond that the sync_id
    // was already processed).
    if ((response.statusCode >= 200 && response.statusCode < 300) ||
        response.statusCode == 409) {
      return body as Map<String, dynamic>;
    }

    final errorMensaje = _extractError(
      body,
      'Error al sincronizar incidente pendiente.',
    );
    throw AuthApiException(errorMensaje);
  }
}
