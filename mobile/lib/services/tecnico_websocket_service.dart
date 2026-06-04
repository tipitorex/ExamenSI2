import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/config/api_config.dart';

class TecnicoWebSocketService {
  static final TecnicoWebSocketService _instance =
      TecnicoWebSocketService._internal();
  factory TecnicoWebSocketService() => _instance;
  TecnicoWebSocketService._internal();

  WebSocketChannel? _channel;
  bool _isConnected = false;
  int _reconnectAttempts = 0;
  final int _maxReconnectAttempts = 5;
  final int _reconnectDelay = 3000;

  String? _currentIncidenteId;
  bool _isSendingLocation = false;

  bool get isConnected => _isConnected;

  void connect(String incidenteId) async {
    _currentIncidenteId = incidenteId;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('tecnico_token');

    if (token == null || token.isEmpty) {
      print('❌ No hay token de técnico');
      return;
    }

    final protocol = 'ws';
    final wsUrl =
        '$protocol://${ApiConfig.baseUrl.replaceFirst('http://', '').replaceFirst('/api/v1', '')}/api/v1/ws?token=$token&incidente_id=$incidenteId';

    print('🔌 Conectando WebSocket técnico: $wsUrl');

    try {
      _channel = IOWebSocketChannel.connect(Uri.parse(wsUrl));

      _channel!.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onDone: () {
          print('🔌 WebSocket desconectado');
          _isConnected = false;
          _reconnect();
        },
        onError: (error) {
          print('❌ WebSocket error: $error');
          _isConnected = false;
          _reconnect();
        },
      );

      _isConnected = true;
      _reconnectAttempts = 0;
      print('✅ WebSocket técnico conectado');
    } catch (e) {
      print('❌ Error conectando WebSocket: $e');
      _reconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message);
      print('📨 Mensaje WebSocket recibido: ${data['tipo']}');

      if (data['tipo'] == 'conexion_establecida') {
        print('✅ Conexión WebSocket establecida');
      }
    } catch (e) {
      print('❌ Error parseando mensaje: $e');
    }
  }

  void _reconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('❌ Máximos intentos de reconexión alcanzados');
      return;
    }

    _reconnectAttempts++;
    final delay = _reconnectDelay * _reconnectAttempts;
    print(
      '🔄 Reintentando conexión en ${delay}ms (intento $_reconnectAttempts/$_maxReconnectAttempts)',
    );

    Future.delayed(Duration(milliseconds: delay), () {
      if (_currentIncidenteId != null) {
        connect(_currentIncidenteId!);
      }
    });
  }

  void startSendingLocation(double lat, double lng) {
    if (!_isConnected) {
      print('⚠️ WebSocket no conectado, no se puede enviar ubicación');
      return;
    }

    _isSendingLocation = true;
    print('📍 Iniciando envío de ubicación cada 3 segundos');

    _sendLocationPeriodically(lat, lng);
  }

  void _sendLocationPeriodically(double lat, double lng) {
    if (!_isSendingLocation) return;

    _sendLocation(lat, lng);

    Future.delayed(const Duration(seconds: 3), () {
      if (_isSendingLocation && _isConnected) {
        _sendLocationPeriodically(lat, lng);
      }
    });
  }

  void _sendLocation(double lat, double lng) {
    if (!_isConnected || _channel == null) return;

    final message = {
      'tipo': 'actualizar_ubicacion',
      'data': {
        'incidente_id': _currentIncidenteId,
        'latitud': lat,
        'longitud': lng,
      },
    };

    _channel!.sink.add(jsonEncode(message));
    print('📍 Ubicación enviada: $lat, $lng');
  }

  void updateLocation(double lat, double lng) {
    if (_isConnected && _isSendingLocation) {
      _sendLocation(lat, lng);
    }
  }

  void stopSendingLocation() {
    _isSendingLocation = false;
    print('🛑 Envío de ubicación detenido');
  }

  void disconnect() {
    stopSendingLocation();
    if (_channel != null) {
      _channel!.sink.close();
      _channel = null;
    }
    _isConnected = false;
    print('🔌 WebSocket desconectado manualmente');
  }
}
