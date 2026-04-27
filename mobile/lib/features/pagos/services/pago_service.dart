import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/config/api_config.dart';
import '../models/factura_model.dart';

class PagoService {
  static const String _tokenKey = 'cliente_token';
  static const String _tipoTokenKey = 'cliente_tipo_token';

  final http.Client _client = http.Client();

  // Obtener headers con token de autenticación
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final tipoToken = prefs.getString(_tipoTokenKey) ?? 'bearer';

    print("🔍 _getHeaders - Token existe: ${token != null ? 'SÍ' : 'NO'}");
    if (token != null && token.isNotEmpty) {
      print(
        "🔍 _getHeaders - Token inicio: ${token.substring(0, token.length > 20 ? 20 : token.length)}...",
      );
    } else {
      print("🔍 _getHeaders - TOKEN ES NULO O VACÍO");
    }

    if (token == null || token.isEmpty) {
      throw Exception('Sesión expirada. Inicia sesión nuevamente.');
    }

    final tipoCapitalizado = tipoToken.isEmpty
        ? 'Bearer'
        : '${tipoToken[0].toUpperCase()}${tipoToken.substring(1).toLowerCase()}';

    return {
      'Content-Type': 'application/json',
      'Authorization': '$tipoCapitalizado $token',
    };
  }

  // Obtener facturas del cliente
  Future<List<Factura>> getMisFacturas() async {
    final headers = await _getHeaders();
    print("📡 getMisFacturas - Llamando a API");
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/pagos/facturas/cliente'),
      headers: headers,
    );

    print("📡 getMisFacturas - Status code: ${response.statusCode}");
    print(
      "📡 getMisFacturas - Body: ${response.body}",
    ); // ✅ VER LA RESPUESTA REAL

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Factura.fromJson(json)).toList();
    } else if (response.statusCode == 401) {
      print("❌ getMisFacturas - 401 No autorizado");
      throw Exception('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      throw Exception('Error al cargar facturas: ${response.statusCode}');
    }
  }

  // Obtener detalle de una factura
  Future<Factura> getFacturaDetalle(int facturaId) async {
    final headers = await _getHeaders();
    print("📡 getFacturaDetalle - Factura ID: $facturaId");
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/pagos/facturas/$facturaId'),
      headers: headers,
    );

    print("📡 getFacturaDetalle - Status code: ${response.statusCode}");
    print(
      "📡 getFacturaDetalle - Body: ${response.body}",
    ); // ✅ VER LA RESPUESTA REAL

    if (response.statusCode == 200) {
      return Factura.fromJson(json.decode(response.body));
    } else if (response.statusCode == 401) {
      print("❌ getFacturaDetalle - 401 No autorizado");
      throw Exception('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      throw Exception(
        'Error al cargar detalle de factura: ${response.statusCode}',
      );
    }
  }

  // Iniciar pago con Stripe
  Future<Map<String, dynamic>> iniciarPago({
    required int facturaId,
    required String successUrl,
    required String cancelUrl,
  }) async {
    final headers = await _getHeaders();
    print("💳 iniciarPago - Factura ID: $facturaId");
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/pagos/iniciar'),
      headers: headers,
      body: json.encode({
        'factura_id': facturaId,
        'success_url': successUrl,
        'cancel_url': cancelUrl,
      }),
    );

    print("💳 iniciarPago - Status code: ${response.statusCode}");
    print("💳 iniciarPago - Body: ${response.body}"); // ✅ VER LA RESPUESTA REAL

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else if (response.statusCode == 401) {
      print("❌ iniciarPago - 401 No autorizado");
      throw Exception('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? 'Error al iniciar pago');
    }
  }

  // Verificar si una factura fue pagada
  Future<bool> verificarPago(int facturaId) async {
    final headers = await _getHeaders();
    print("✅ verificarPago - Factura ID: $facturaId");
    final response = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/pagos/verificar/$facturaId'),
      headers: headers,
    );

    print("✅ verificarPago - Status code: ${response.statusCode}");
    print(
      "✅ verificarPago - Body: ${response.body}",
    ); // ✅ VER LA RESPUESTA REAL

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final pagado = data['pagado'] == true;
      print("✅ verificarPago - Pagado: $pagado");
      return pagado;
    } else if (response.statusCode == 401) {
      print("❌ verificarPago - 401 No autorizado");
      throw Exception('Sesión expirada. Inicia sesión nuevamente.');
    } else {
      throw Exception('Error al verificar pago: ${response.statusCode}');
    }
  }
}
