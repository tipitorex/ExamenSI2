import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/api_config.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  static Future<void> initialize() async {
    print('🌐 Usando backend URL: ${ApiConfig.baseUrl}');

    // Solicitar permiso para notificaciones
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

    // Obtener el token FCM del dispositivo
    String? token = await _messaging.getToken();
    print('📱 FCM Token: $token');

    // Guardar token pendiente si no hay cliente logueado
    if (token != null) {
      final prefs = await SharedPreferences.getInstance();
      final clienteId = prefs.getInt('cliente_id');
      if (clienteId == null) {
        print('⚠️ No hay cliente logueado, token guardado para después');
        await prefs.setString('pending_fcm_token', token);
      } else {
        // Si ya hay cliente logueado, enviar inmediatamente
        print('✅ Cliente ya logueado, enviando token al backend');
        await _enviarTokenAlBackend(token);
      }
    }

    // Escuchar cuando el token se refresca
    _messaging.onTokenRefresh.listen((newToken) {
      print('🔄 Token FCM refrescado: $newToken');
      _enviarTokenAlBackend(newToken);
    });

    // Escuchar notificaciones cuando la app está en primer plano
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📨 Notificación recibida: ${message.notification?.title}');
      print('📝 Mensaje: ${message.notification?.body}');
    });

    // Escuchar cuando la app se abre desde una notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📱 App abierta desde notificación');
      _handleNotificationTap(message);
    });

    // Capturar cuando la app se abre desde una notificación cuando estaba cerrada
    RemoteMessage? initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      print('📱 App abierta desde notificación (app cerrada)');
      _handleNotificationTap(initialMessage);
    }
  }

  /// Envía el token FCM al backend
  static Future<void> _enviarTokenAlBackend(String token) async {
    final prefs = await SharedPreferences.getInstance();
    final clienteId = prefs.getInt('cliente_id');
    final authToken = prefs.getString(
      'cliente_token',
    ); // ← Obtener token de autenticación

    print('🔍 _enviarTokenAlBackend - clienteId: $clienteId');
    print('🔍 Auth Token existe: ${authToken != null}');

    // Si no hay cliente logueado, guardamos el token para después
    if (clienteId == null) {
      print('⚠️ No hay cliente logueado, token guardado para después');
      await prefs.setString('pending_fcm_token', token);
      return;
    }

    // Si no hay token de autenticación, no podemos enviar
    if (authToken == null) {
      print('⚠️ No hay token de autenticación, guardando token para después');
      await prefs.setString('pending_fcm_token', token);
      return;
    }

    try {
      final headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken', // ← Header de autenticación
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

      if (response.statusCode == 200) {
        print('✅ Token FCM registrado en backend');
        await prefs.remove('pending_fcm_token');
      } else if (response.statusCode == 401) {
        print(
          '❌ Error de autenticación. El token de sesión puede haber expirado.',
        );
        // No borramos el token pendiente, se reintentará después
      } else {
        print(
          '❌ Error registrando token: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      print('❌ Error de red al registrar token: $e');
    }
  }

  /// Enviar token pendiente después de que el usuario inicie sesión
  static Future<void> enviarTokenPendiente() async {
    print('🔄 enviarTokenPendiente() fue llamado');

    final prefs = await SharedPreferences.getInstance();
    final pendingToken = prefs.getString('pending_fcm_token');
    final clienteId = prefs.getInt('cliente_id');

    print('📝 Token pendiente: $pendingToken');
    print('📝 Cliente ID: $clienteId');

    if (pendingToken != null && clienteId != null) {
      print('🔄 Enviando token pendiente al backend');
      await _enviarTokenAlBackend(pendingToken);
    } else {
      print('⚠️ No hay token pendiente o no hay cliente ID');
      if (pendingToken == null) print('⚠️ pendingToken es null');
      if (clienteId == null) print('⚠️ clienteId es null');
    }
  }

  /// Manejar cuando el usuario toca una notificación
  static void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    final incidenteId = data['incidente_id'];
    final tipo = data['tipo'];

    print('🔘 Notificación tocada - Tipo: $tipo, Incidente: $incidenteId');
  }
}
