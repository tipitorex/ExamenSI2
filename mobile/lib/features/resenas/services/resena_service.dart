import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/api_config.dart';
import '../../../features/auth/services/auth_api_service.dart';

class ResenaService {
  static final ResenaService _instance = ResenaService._internal();
  factory ResenaService() => _instance;
  ResenaService._internal();

  Future<bool> enviarResena({
    required int incidenteId,
    required int puntuacionTaller,
    int? puntuacionTecnico,
    String? comentario,
  }) async {
    try {
      final headers = await AuthApiService.instance.obtenerHeadersAutorizados();

      final body = {
        'incidente_id': incidenteId,
        'puntuacion_taller': puntuacionTaller,
        if (puntuacionTecnico != null) 'puntuacion_tecnico': puntuacionTecnico,
        if (comentario != null && comentario.isNotEmpty) 'comentario': comentario,
      };

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/resenas'),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      if (response.statusCode == 201) {
        print('✅ Reseña enviada correctamente');
        return true;
      } else if (response.statusCode == 409) {
        print('ℹ️ Ya existe una reseña para este incidente');
        return false;
      } else {
        print('❌ Error enviando reseña: ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Error de red enviando reseña: $e');
      return false;
    }
  }

  Future<bool> yaCalificaste(int incidenteId) async {
    try {
      final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/resenas/mi-resena/$incidenteId'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['tiene_resena'] == true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
