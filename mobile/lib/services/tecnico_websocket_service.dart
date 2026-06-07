import 'dart:async';
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
  Timer? _locationTimer;
  int _sendIntervalSeconds = 20;

  bool get isConnected => _isConnected;
  bool get isSendingLocation => _isSendingLocation; // ✅ NUEVO GETTER

  void connect(String incidenteId) async {
    print('🔌 [CONNECT] Conectando a incidente: $incidenteId');

    // Si ya está conectado al mismo incidente, no hacer nada
    if (_isConnected && _currentIncidenteId == incidenteId) {
      print('🔌 WebSocket ya conectado al incidente $incidenteId');
      return;
    }

    // Cerrar conexión anterior si existe
    if (_channel != null) {
      print('🔌 [CONNECT] Cerrando conexión anterior...');
      disconnect();
    }

    _currentIncidenteId = incidenteId;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('tecnico_token');

    if (token == null || token.isEmpty) {
      print('❌ No hay token de técnico');
      return;
    }

    // Construir URL correctamente
    final baseUrl = ApiConfig.baseUrl
        .replaceFirst('http://', '')
        .replaceFirst('/api/v1', '');
    final wsUrl =
        'ws://$baseUrl/api/v1/ws?token=$token&incidente_id=$incidenteId';

    print('🔌 Conectando WebSocket técnico a incidente: $incidenteId');
    print('🔌 URL: $wsUrl');

    try {
      _channel = IOWebSocketChannel.connect(Uri.parse(wsUrl));
      print('🔌 [CONNECT] Canal creado, esperando conexión...');

      _channel!.stream.listen(
        (message) {
          print('📨 [TECNICO] Mensaje RAW recibido: $message');
          _handleMessage(message);
        },
        onDone: () {
          print('🔌 WebSocket desconectado (onDone)');
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
      print('📨 Datos completos: $data');

      if (data['tipo'] == 'conexion_establecida') {
        print('✅ Conexión WebSocket establecida');
      } else if (data['tipo'] == 'pong') {
        print('💓 Pong recibido');
      } else if (data['tipo'] == 'ubicacion_tecnico') {
        print('📍 Ubicación confirmada por el backend');
      } else {
        print('⚠️ Tipo de mensaje no reconocido: ${data['tipo']}');
      }
    } catch (e) {
      print('❌ Error parseando mensaje: $e');
      print('❌ Mensaje original: $message');
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

  void startSendingLocation(
    double lat,
    double lng, {
    int intervalSeconds = 5,
  }) {
    print('📍 [START] startSendingLocation llamado');
    print('📍 _isConnected: $_isConnected');
    print('📍 _isSendingLocation: $_isSendingLocation');

    if (!_isConnected) {
      print('⚠️ WebSocket no conectado, no se puede enviar ubicación');
      return;
    }

    if (_isSendingLocation) {
      print('📍 Ya se está enviando ubicación');
      return;
    }

    _isSendingLocation = true;
    _sendIntervalSeconds = intervalSeconds;
    print(
      '📍 Iniciando envío de ubicación cada $_sendIntervalSeconds segundos',
    );

    // Enviar ubicación inmediatamente
    _sendLocation(lat, lng);

    // Iniciar timer periódico
    _locationTimer = Timer.periodic(Duration(seconds: _sendIntervalSeconds), (
      timer,
    ) {
      print('📍 [TIMER] Tick cada $_sendIntervalSeconds segundos');
      print(
        '📍 _isSendingLocation: $_isSendingLocation, _isConnected: $_isConnected',
      );
      if (_isSendingLocation && _isConnected) {
        print('📍 [TIMER] Estado activo, esperando updateLocation...');
      } else {
        print(
          '⚠️ [TIMER] No se enviará ubicación: isSending=$_isSendingLocation, isConnected=$_isConnected',
        );
      }
    });
  }

  void _sendLocation(double lat, double lng) {
    print('📍 [_sendLocation] Enviando ubicación...');
    print('📍 _isConnected: $_isConnected');
    print('📍 _channel: ${_channel != null}');
    print('📍 _currentIncidenteId: $_currentIncidenteId');

    if (!_isConnected || _channel == null) {
      print('❌ _sendLocation: no conectado');
      return;
    }
    if (_currentIncidenteId == null) {
      print('❌ _sendLocation: incidenteId es null');
      return;
    }

    final message = {
      'tipo': 'actualizar_ubicacion',
      'data': {
        'incidente_id': _currentIncidenteId,
        'latitud': lat,
        'longitud': lng,
      },
    };

    final jsonMessage = jsonEncode(message);
    print('📤 Enviando mensaje: $jsonMessage');

    try {
      _channel!.sink.add(jsonMessage);
      print('📍 Ubicación enviada correctamente: $lat, $lng');
    } catch (e) {
      print('❌ Error enviando ubicación: $e');
    }
  }

  void updateLocation(double lat, double lng) {
    print('📍 [UPDATE] updateLocation llamado: lat=$lat, lng=$lng');
    print(
      '📍 _isConnected: $_isConnected, _isSendingLocation: $_isSendingLocation',
    );

    if (_isConnected && _isSendingLocation) {
      _sendLocation(lat, lng);
    } else {
      print(
        '⚠️ No se envía ubicación: isConnected=$_isConnected, isSendingLocation=$_isSendingLocation',
      );
    }
  }

  void stopSendingLocation() {
    print('🛑 stopSendingLocation llamado');
    _isSendingLocation = false;
    _locationTimer?.cancel();
    _locationTimer = null;
    print('🛑 Envío de ubicación detenido');
  }

  void disconnect() {
    print('🔌 disconnect llamado');
    stopSendingLocation();
    if (_channel != null) {
      try {
        _channel!.sink.close();
        print('🔌 Canal cerrado correctamente');
      } catch (e) {
        print('❌ Error cerrando WebSocket: $e');
      }
      _channel = null;
    }
    _isConnected = false;
    _currentIncidenteId = null;
    print('🔌 WebSocket desconectado manualmente');
  }
}
