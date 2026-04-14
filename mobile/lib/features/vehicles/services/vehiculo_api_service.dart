import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';
import '../models/vehiculo_model.dart';

class VehiculoApiService {
  VehiculoApiService._();

  static final VehiculoApiService instance = VehiculoApiService._();

  final http.Client _client = http.Client();

  Future<VehiculoModel> crearVehiculo({
    required String placa,
    required String marca,
    required String modelo,
    int? anio,
    String? color,
  }) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/vehiculos'),
      headers: {...headers, 'Content-Type': 'application/json'},
      body: jsonEncode({
        'placa': placa.toUpperCase().trim(),
        'marca': marca.trim(),
        'modelo': modelo.trim(),
        'anio': anio,
        'color': (color == null || color.trim().isEmpty) ? null : color.trim(),
      }),
    );

    final body = _decodeBody(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        _extractError(body, 'No se pudo registrar el vehiculo.'),
      );
    }

    return VehiculoModel.fromJson(body as Map<String, dynamic>);
  }

  Future<List<VehiculoModel>> listarVehiculos() async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/vehiculos'),
      headers: headers,
    );

    final body = _decodeBody(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        _extractError(body, 'No se pudieron obtener los vehiculos.'),
      );
    }

    if (body is! List) {
      return <VehiculoModel>[];
    }

    return body
        .cast<Map<String, dynamic>>()
        .map(VehiculoModel.fromJson)
        .toList();
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
