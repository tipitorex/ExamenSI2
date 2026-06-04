import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/config/api_config.dart';
import '../models/auth_session.dart';
import '../models/cliente_model.dart';
import '../models/tecnico_model.dart';
import '../../../../services/notification_service.dart';

class AuthApiService {
  AuthApiService._();

  static final AuthApiService instance = AuthApiService._();

  // Claves para cliente
  static const _clienteTokenKey = 'cliente_token';
  static const _clienteTipoTokenKey = 'cliente_tipo_token';
  static const _clienteKey = 'cliente_data';
  static const _clienteIdKey = 'cliente_id';

  // Claves para técnico
  static const _tecnicoTokenKey = 'tecnico_token';
  static const _tecnicoTipoTokenKey = 'tecnico_tipo_token';
  static const _tecnicoKey = 'tecnico_data';
  static const _tecnicoIdKey = 'tecnico_id';

  // Rol actual
  static const _userRoleKey = 'user_role';

  final http.Client _client = http.Client();

  // ============================================================
  // CLIENTE
  // ============================================================

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

    await _guardarClienteId(cliente.id);

    return cliente;
  }

  Future<AuthSession> iniciarSesionCliente({
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
      throw AuthApiException(
        _extractError(body, 'No se pudo iniciar sesión como cliente.'),
      );
    }

    final session = AuthSession.fromJson(body as Map<String, dynamic>);
    await _guardarSesionCliente(session);
    await _guardarClienteId(session.cliente.id);
    await _guardarRol('cliente');

    // Esperar un momento para que el token FCM esté listo
    await Future.delayed(const Duration(milliseconds: 500));

    // Enviar token pendiente después de iniciar sesión
    await NotificationService.enviarTokenPendiente();

    return session;
  }

  Future<void> _guardarClienteId(int clienteId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_clienteIdKey, clienteId);
    print('✅ Cliente ID guardado en SharedPreferences: $clienteId');
  }

  Future<int?> obtenerClienteId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_clienteIdKey);
  }

  Future<ClienteModel?> obtenerSesionClienteGuardada() async {
    final prefs = await SharedPreferences.getInstance();
    final rawCliente = prefs.getString(_clienteKey);
    if (rawCliente == null) {
      return null;
    }

    return ClienteModel.fromJson(
      jsonDecode(rawCliente) as Map<String, dynamic>,
    );
  }

  Future<void> _guardarSesionCliente(AuthSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_clienteTokenKey, session.tokenAcceso);
    await prefs.setString(_clienteTipoTokenKey, session.tipoToken);
    await prefs.setString(_clienteKey, jsonEncode(session.cliente.toJson()));
  }

  // ============================================================
  // TÉCNICO
  // ============================================================

  Future<Map<String, dynamic>> iniciarSesionTecnico({
    required String email,
    required String contrasena,
  }) async {
    final response = await _client.post(
      Uri.parse('${ApiConfig.baseUrl}/tecnicos/iniciar-sesion'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'contrasena': contrasena}),
    );

    final body = _decodeBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(
        _extractError(body, 'No se pudo iniciar sesión como técnico.'),
      );
    }

    final data = body as Map<String, dynamic>;
    await _guardarSesionTecnico(data);
    await _guardarRol('tecnico');

    return data;
  }

  Future<void> _guardarSesionTecnico(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tecnicoTokenKey, data['token_acceso']);
    await prefs.setString(_tecnicoTipoTokenKey, data['tipo_token']);
    await prefs.setString(_tecnicoKey, jsonEncode(data['tecnico']));
    await prefs.setInt(_tecnicoIdKey, data['tecnico']['id']);
    print('✅ Técnico ID guardado: ${data['tecnico']['id']}');
  }

  Future<TecnicoModel?> obtenerSesionTecnicoGuardada() async {
    final prefs = await SharedPreferences.getInstance();
    final rawTecnico = prefs.getString(_tecnicoKey);
    if (rawTecnico == null) return null;

    return TecnicoModel.fromJson(
      jsonDecode(rawTecnico) as Map<String, dynamic>,
    );
  }

  Future<int?> obtenerTecnicoId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_tecnicoIdKey);
  }

  // ============================================================
  // UTILIDADES GENERALES
  // ============================================================

  Future<void> _guardarRol(String rol) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userRoleKey, rol);
    print('✅ Rol guardado: $rol');
  }

  Future<String?> obtenerRolActual() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userRoleKey);
  }

  Future<void> cerrarSesion() async {
    final prefs = await SharedPreferences.getInstance();

    // Limpiar datos de cliente
    await prefs.remove(_clienteTokenKey);
    await prefs.remove(_clienteTipoTokenKey);
    await prefs.remove(_clienteKey);
    await prefs.remove(_clienteIdKey);

    // Limpiar datos de técnico
    await prefs.remove(_tecnicoTokenKey);
    await prefs.remove(_tecnicoTipoTokenKey);
    await prefs.remove(_tecnicoKey);
    await prefs.remove(_tecnicoIdKey);

    // Limpiar rol
    await prefs.remove(_userRoleKey);

    print('✅ Sesión cerrada, todos los datos limpiados');
  }

  Future<Map<String, String>> obtenerHeadersAutorizados() async {
    final prefs = await SharedPreferences.getInstance();
    final rol = prefs.getString(_userRoleKey);

    String token;
    String tipoToken;

    if (rol == 'tecnico') {
      token = prefs.getString(_tecnicoTokenKey) ?? '';
      tipoToken = prefs.getString(_tecnicoTipoTokenKey) ?? 'bearer';
    } else {
      token = prefs.getString(_clienteTokenKey) ?? '';
      tipoToken = prefs.getString(_clienteTipoTokenKey) ?? 'bearer';
    }

    if (token.isEmpty) {
      throw AuthApiException('Sesión expirada. Inicia sesión nuevamente.');
    }

    final tipoCapitalizado = tipoToken.isEmpty
        ? 'Bearer'
        : '${tipoToken[0].toUpperCase()}${tipoToken.substring(1).toLowerCase()}';

    return {'Authorization': '$tipoCapitalizado $token'};
  }

  Future<bool> estaAutenticado() async {
    final prefs = await SharedPreferences.getInstance();
    final rol = prefs.getString(_userRoleKey);

    if (rol == 'tecnico') {
      final token = prefs.getString(_tecnicoTokenKey);
      return token != null && token.isNotEmpty;
    } else {
      final token = prefs.getString(_clienteTokenKey);
      return token != null && token.isNotEmpty;
    }
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
