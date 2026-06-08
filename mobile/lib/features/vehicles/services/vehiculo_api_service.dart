import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';
import '../models/vehiculo_model.dart';

const _kCacheKey = 'vehiculos_cache';

class VehiculoApiService {
  VehiculoApiService._();

  static final VehiculoApiService instance = VehiculoApiService._();

  final http.Client _client = http.Client();

  // ============================================================
  // CREAR VEHÍCULO
  // ============================================================
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

  // ============================================================
  // LISTAR VEHÍCULOS
  // ============================================================
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

    final vehiculos = body
        .cast<Map<String, dynamic>>()
        .map(VehiculoModel.fromJson)
        .toList();

    await _guardarEnCache(vehiculos);
    return vehiculos;
  }

  // ============================================================
  // CACHÉ OFFLINE
  // ============================================================
  Future<List<VehiculoModel>> listarVehiculosCacheados() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_kCacheKey);
    if (json == null) return [];
    final lista = jsonDecode(json) as List;
    return lista.cast<Map<String, dynamic>>().map(VehiculoModel.fromJson).toList();
  }

  Future<void> _guardarEnCache(List<VehiculoModel> vehiculos) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kCacheKey,
      jsonEncode(vehiculos.map((v) => v.toJson()).toList()),
    );
  }

  Future<void> limpiarCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kCacheKey);
  }

  // ============================================================
  // ELIMINAR VEHÍCULO (NUEVO)
  // ============================================================
  Future<void> eliminarVehiculo(int vehiculoId) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

    final response = await _client.delete(
      Uri.parse('${ApiConfig.baseUrl}/vehiculos/$vehiculoId'),
      headers: headers,
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = _decodeBody(response.body);
      throw AuthApiException(
        _extractError(body, 'No se pudo eliminar el vehículo.'),
      );
    }
  }

  // ============================================================
  // MÉTODOS AUXILIARES
  // ============================================================
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
