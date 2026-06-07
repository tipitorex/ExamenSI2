import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/api_config.dart';

class ClienteWebSocketService {
  static final ClienteWebSocketService _instance =
      ClienteWebSocketService._internal();
  factory ClienteWebSocketService() => _instance;
  ClienteWebSocketService._internal();

  WebSocketChannel? _channel;
  bool _isConnected = false;
  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 5;
  final int _reconnectDelay = 3000;

  String? _currentIncidenteId;
  bool _isSubscribed = false;

  // Subjects para notificar cambios
  final _estadoSubject = StreamController<Map<String, dynamic>>.broadcast();
  final _ubicacionSubject = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onEstadoCambio => _estadoSubject.stream;
  Stream<Map<String, dynamic>> get onUbicacionTecnico =>
      _ubicacionSubject.stream;

  bool get isConnected => _isConnected;

  void connect(String incidenteId) async {
    print('🔌 [CLIENTE] Conectando a incidente: $incidenteId');

    if (_isConnected && _currentIncidenteId == incidenteId) {
      print('🔌 [CLIENTE] WebSocket ya conectado al incidente $incidenteId');
      return;
    }

    if (_channel != null) {
      disconnect();
    }

    _currentIncidenteId = incidenteId;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('cliente_token');

    if (token == null || token.isEmpty) {
      print('❌ [CLIENTE] No hay token de cliente');
      return;
    }

    final baseUrl = ApiConfig.baseUrl
        .replaceFirst('http://', '')
        .replaceFirst('/api/v1', '');
    final wsUrl =
        'ws://$baseUrl/api/v1/ws?token=$token&incidente_id=$incidenteId';

    print('🔌 [CLIENTE] Conectando a: $wsUrl');

    try {
      _channel = IOWebSocketChannel.connect(Uri.parse(wsUrl));
      print('🔌 [CLIENTE] Canal creado, esperando conexión...');

      _channel!.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onDone: () {
          print('🔌 [CLIENTE] WebSocket desconectado');
          _isConnected = false;
          _reconnect();
        },
        onError: (error) {
          print('❌ [CLIENTE] WebSocket error: $error');
          _isConnected = false;
          _reconnect();
        },
      );

      _isConnected = true;
      _reconnectAttempts = 0;
      print('✅ [CLIENTE] WebSocket conectado');
    } catch (e) {
      print('❌ [CLIENTE] Error conectando WebSocket: $e');
      _reconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      print('📨 [CLIENTE] Mensaje recibido: ${data['tipo']}');

      switch (data['tipo']) {
        case 'conexion_establecida':
          print('✅ [CLIENTE] Conexión establecida');
          _isSubscribed = true;
          break;

        case 'estado_incidente':
          final estadoData = data['data'];
          print('📌 [CLIENTE] Estado actualizado: ${estadoData['estado']}');
          if (estadoData['tecnico_nombre'] != null) {
            print('👨‍🔧 Técnico: ${estadoData['tecnico_nombre']}');
          }
          _estadoSubject.add(estadoData);
          break;

        case 'ubicacion_tecnico':
          final ubicacionData = data['data'];
          print(
            '📍 [CLIENTE] Ubicación del técnico: ${ubicacionData['tecnico_nombre']}',
          );
          print(
            '   📍 Lat: ${ubicacionData['latitud']}, Lng: ${ubicacionData['longitud']}',
          );
          _ubicacionSubject.add(ubicacionData);
          break;

        case 'pong':
          // Respuesta al ping, ignorar
          break;

        default:
          print('⚠️ [CLIENTE] Tipo desconocido: ${data['tipo']}');
      }
    } catch (e) {
      print('❌ [CLIENTE] Error parseando mensaje: $e');
      print('❌ Mensaje original: $message');
    }
  }

  void _reconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('❌ [CLIENTE] Máximos intentos de reconexión alcanzados');
      return;
    }

    _reconnectAttempts++;
    final delay = _reconnectDelay * _reconnectAttempts;
    print(
      '🔄 [CLIENTE] Reintentando en ${delay}ms (intento $_reconnectAttempts/$_maxReconnectAttempts)',
    );

    Future.delayed(Duration(milliseconds: delay), () {
      if (_currentIncidenteId != null) {
        connect(_currentIncidenteId!);
      }
    });
  }

  void disconnect() {
    print('🔌 [CLIENTE] Desconectando manualmente');
    if (_channel != null) {
      try {
        _channel!.sink.close();
      } catch (e) {
        print('❌ [CLIENTE] Error cerrando WebSocket: $e');
      }
      _channel = null;
    }
    _isConnected = false;
    _currentIncidenteId = null;
    _isSubscribed = false;
  }
}
