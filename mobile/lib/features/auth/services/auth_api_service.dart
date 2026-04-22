import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/config/api_config.dart';
import '../models/auth_session.dart';
import '../models/cliente_model.dart';

class AuthApiService {
  AuthApiService._();

  static final AuthApiService instance = AuthApiService._();

  static const _tokenKey = 'cliente_token';
  static const _tipoTokenKey = 'cliente_tipo_token';
  static const _clienteKey = 'cliente_data';
  static const _clienteIdKey = 'cliente_id'; // NUEVO: Para guardar solo el ID

  final http.Client _client = http.Client();

  Future<ClienteModel> registrarCliente({
    required String nombreCompleto,
    required String email,
    required String telefono,
    required String contrasena,
  }) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/clientes'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'nombre_completo': nombreCompleto,
        'email': email,
        'telefono': telefono.isEmpty ? null : telefono,
        'contrasena': contrasena,
      }),
    );

    final body = _decodeBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        _extractError(body, 'No se pudo registrar el cliente.'),
      );
    }

    final cliente = ClienteModel.fromJson(body as Map<String, dynamic>);

    // NUEVO: Guardar el ID del cliente después del registro
    await _guardarClienteId(cliente.id);

    return cliente;
  }

  Future<AuthSession> iniciarSesion({
    required String email,
    required String contrasena,
  }) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/autenticacion/iniciar-sesion'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'contrasena': contrasena}),
    );

    final body = _decodeBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractError(body, 'No se pudo iniciar sesion.'));
    }

    final session = AuthSession.fromJson(body as Map<String, dynamic>);
    await _guardarSesion(session);

    // NUEVO: Guardar el ID del cliente en SharedPreferences
    await _guardarClienteId(session.cliente.id);

    return session;
  }

  // NUEVO: Función para guardar solo el ID del cliente
  Future<void> _guardarClienteId(int clienteId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_clienteIdKey, clienteId);
    print('✅ Cliente ID guardado en SharedPreferences: $clienteId');
  }

  // NUEVO: Función para obtener el ID del cliente guardado
  Future<int?> obtenerClienteId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_clienteIdKey);
  }

  Future<ClienteModel?> obtenerSesionGuardada() async {
    final prefs = await SharedPreferences.getInstance();
    final rawCliente = prefs.getString(_clienteKey);
    if (rawCliente == null) {
      return null;
    }

    return ClienteModel.fromJson(
      jsonDecode(rawCliente) as Map<String, dynamic>,
    );
  }

  Future<void> cerrarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_tipoTokenKey);
    await prefs.remove(_clienteKey);
    await prefs.remove(_clienteIdKey); // NUEVO: Limpiar también el ID
    print('✅ Sesión cerrada, datos limpiados');
  }

  Future<Map<String, String>> obtenerHeadersAutorizados() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final tipoToken = prefs.getString(_tipoTokenKey) ?? 'bearer';

    if (token == null || token.isEmpty) {
      throw AuthApiException('Sesion expirada. Inicia sesion nuevamente.');
    }

    final tipoCapitalizado = tipoToken.isEmpty
        ? 'Bearer'
        : '${tipoToken[0].toUpperCase()}${tipoToken.substring(1).toLowerCase()}';

    return {'Authorization': '$tipoCapitalizado $token'};
  }

  Future<void> _guardarSesion(AuthSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, session.tokenAcceso);
    await prefs.setString(_tipoTokenKey, session.tipoToken);
    await prefs.setString(_clienteKey, jsonEncode(session.cliente.toJson()));
  }

  dynamic _decodeBody(String rawBody) {
    if (rawBody.isEmpty) {
      return <String, dynamic>{};
    }
    return jsonDecode(rawBody);
  }

  String _extractError(dynamic body, String fallback) {
    if (body is Map<String, dynamic> && body['detail'] is String) {
      return body['detail'] as String;
    }
    return fallback;
  }
}

class AuthApiException implements Exception {
  AuthApiException(this.message);

  final String message;

  @override
  String toString() => message;
}
