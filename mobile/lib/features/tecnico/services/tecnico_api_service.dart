import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/config/api_config.dart';
import '../models/asignacion_tecnico_model.dart';

class TecnicoApiService {
  TecnicoApiService._();
  static final TecnicoApiService instance = TecnicoApiService._();

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('tecnico_token');
    final tipoToken = prefs.getString('tecnico_tipo_token') ?? 'bearer';

    if (token == null || token.isEmpty) {
      throw Exception('No hay sesión de técnico');
    }

    final tipoCapitalizado = tipoToken.isEmpty
        ? 'Bearer'
        : '${tipoToken[0].toUpperCase()}${tipoToken.substring(1).toLowerCase()}';

    return {
      'Content-Type': 'application/json',
      'Authorization': '$tipoCapitalizado $token',
    };
  }

  Future<List<AsignacionTecnico>> obtenerMisAsignaciones() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/tecnicos/mis-asignaciones'),
        headers: headers,
      );

      print(
        '📡 GET /tecnicos/mis-asignaciones - Status: ${response.statusCode}',
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => AsignacionTecnico.fromJson(json)).toList();
      } else {
        print('❌ Error: ${response.body}');
        throw Exception('Error al cargar asignaciones: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Excepción: $e');
      throw Exception('Error de conexión: $e');
    }
  }

  Future<AsignacionTecnico> obtenerDetalleAsignacion(int incidenteId) async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/tecnicos/asignacion/$incidenteId'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      return AsignacionTecnico.fromJson(jsonDecode(response.body));
    }
    throw Exception('Error al cargar detalle');
  }

  Future<void> aceptarAsignacion(int incidenteId) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(
        '${ApiConfig.baseUrl}/tecnicos/asignacion/$incidenteId/aceptar',
      ),
      headers: headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Error al aceptar asignación');
    }
  }

  Future<void> actualizarEstado(int incidenteId, String estado) async {
    final headers = await _getHeaders();
    final response = await http.patch(
      Uri.parse('${ApiConfig.baseUrl}/incidentes/$incidenteId/estado'),
      headers: headers,
      body: jsonEncode({'estado': estado}),
    );

    if (response.statusCode != 200) {
      throw Exception('Error al actualizar estado');
    }
  }

  Future<void> compartirUbicacion(
    int incidenteId,
    double lat,
    double lng,
  ) async {
    final headers = await _getHeaders();
    await http.post(
      Uri.parse('${ApiConfig.baseUrl}/tecnicos/ubicacion'),
      headers: headers,
      body: jsonEncode({
        'incidente_id': incidenteId,
        'latitud': lat,
        'longitud': lng,
      }),
    );
  }
}
