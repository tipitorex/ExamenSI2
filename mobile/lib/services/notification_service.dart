import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/api_config.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static String? _cachedToken;

  static Future<void> initialize() async {
    // ✅ No hacer nada en web
    if (kIsWeb) {
      print('🌐 Web - Notificaciones deshabilitadas');
      return;
    }

    print('🌐 Usando backend URL: ${ApiConfig.baseUrl}');

    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus != AuthorizationStatus.authorized) {
      print('❌ Permiso de notificaciones denegado');
      return;
    }

    print('✅ Permiso de notificaciones concedido');

    String? token = await _messaging.getToken();
    _cachedToken = token;
    print('📱 FCM Token: $token');

    if (token != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', token);
      print('💾 Token guardado localmente');

      final clienteId = prefs.getInt('cliente_id');
      final authToken = prefs.getString('cliente_token');

      if (clienteId != null && authToken != null) {
        print('✅ Cliente ya logueado, enviando token al backend');
        await _enviarTokenAlBackend(token);
      } else {
        print('⚠️ No hay cliente logueado, token guardado para después');
        await prefs.setString('pending_fcm_token', token);
      }
    }

    _messaging.onTokenRefresh.listen((newToken) async {
      print('🔄 Token FCM refrescado: $newToken');
      _cachedToken = newToken;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', newToken);
      await _enviarTokenAlBackend(newToken);
    });

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📨 Notificación recibida: ${message.notification?.title}');
      print('📝 Mensaje: ${message.notification?.body}');
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📱 App abierta desde notificación');
      _handleNotificationTap(message);
    });

    RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      print('📱 App abierta desde notificación (app cerrada)');
      _handleNotificationTap(initialMessage);
    }
  }

  static Future<String?> getToken() async {
    if (kIsWeb) return null;
    if (_cachedToken != null) return _cachedToken;
    _cachedToken = await _messaging.getToken();
    return _cachedToken;
  }

  static Future<void> _enviarTokenAlBackend(String token) async {
    if (kIsWeb) return;

    final prefs = await SharedPreferences.getInstance();
    final clienteId = prefs.getInt('cliente_id');
    final authToken = prefs.getString('cliente_token');

    print('🔍 _enviarTokenAlBackend - clienteId: $clienteId');
    print('🔍 Auth Token existe: ${authToken != null}');

    if (clienteId == null || authToken == null) {
      print(
        '⚠️ No hay cliente logueado o token de autenticación, guardando para después',
      );
      await prefs.setString('pending_fcm_token', token);
      return;
    }

    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      };

      print(
        '📤 Enviando token al backend: ${ApiConfig.baseUrl}/dispositivos/registrar',
      );

      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/dispositivos/registrar'),
        headers: headers,
        body: json.encode({
          'cliente_id': clienteId,
          'fcm_token': token,
          'plataforma': 'android',
        }),
      );

      print('📥 Respuesta del backend: ${response.statusCode}');
      print('📥 Cuerpo: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ Token FCM registrado en backend');
        await prefs.remove('pending_fcm_token');
      } else if (response.statusCode == 401) {
        print(
          '❌ Error de autenticación. El token de sesión puede haber expirado.',
        );
      } else {
        print(
          '❌ Error registrando token: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      print('❌ Error de red al registrar token: $e');
    }
  }

  static Future<void> enviarTokenPendiente() async {
    if (kIsWeb) return;

    print('🔄 enviarTokenPendiente() fue llamado');

    final prefs = await SharedPreferences.getInstance();

    String? currentToken = await getToken();
    String? token =
        currentToken ??
        prefs.getString('pending_fcm_token') ??
        prefs.getString('fcm_token');

    final clienteId = prefs.getInt('cliente_id');

    print('📝 Token a enviar: ${token != null ? "Existe" : "null"}');
    print('📝 Cliente ID: $clienteId');

    if (token != null && clienteId != null) {
      print('🔄 Enviando token al backend');
      await _enviarTokenAlBackend(token);
    } else {
      print('⚠️ No hay token para enviar o no hay cliente ID');
      if (token == null) print('⚠️ token es null');
      if (clienteId == null) print('⚠️ clienteId es null');

      if (clienteId != null && token == null) {
        print('⏳ Esperando token FCM... reintentando en 2 segundos');
        await Future.delayed(const Duration(seconds: 2));
        String? retryToken = await getToken();
        if (retryToken != null) {
          print('🔄 Reintentando con token obtenido: $retryToken');
          await _enviarTokenAlBackend(retryToken);
        } else {
          print('❌ No se pudo obtener token FCM después de reintentar');
        }
      }
    }
  }

  static Future<void> registrarTokenTecnico() async {
    if (kIsWeb) return;
    final prefs = await SharedPreferences.getInstance();
    final token = _cachedToken ?? await _messaging.getToken();
    if (token == null) return;

    final authToken = prefs.getString('tecnico_token');
    final tipoToken = prefs.getString('tecnico_tipo_token') ?? 'bearer';
    if (authToken == null) return;

    final tipoFmt = tipoToken.isEmpty
        ? 'Bearer'
        : '${tipoToken[0].toUpperCase()}${tipoToken.substring(1).toLowerCase()}';

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/dispositivos/registrar-tecnico'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': '$tipoFmt $authToken',
        },
        body: json.encode({'fcm_token': token, 'plataforma': 'android'}),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ Token FCM técnico registrado en backend');
      } else {
        print('❌ Error registrando token técnico: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Error de red registrando token técnico: $e');
    }
  }

  static void _handleNotificationTap(RemoteMessage message) {
    if (kIsWeb) return;

    final data = message.data;
    final incidenteId = data['incidente_id'];
    final tipo = data['tipo'];

    print('🔘 Notificación tocada - Tipo: $tipo, Incidente: $incidenteId');
  }
}
