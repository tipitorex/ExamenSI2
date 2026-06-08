import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'local_db_service.dart';
import 'notification_service.dart';
import '../features/auth/services/auth_api_service.dart';
import '../core/config/api_config.dart';

class SyncService extends ChangeNotifier {
  SyncService._();
  static final SyncService instance = SyncService._();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _sincronizando = false;
  int _pendientesCount = 0;
  String? _ultimoError;

  bool get sincronizando => _sincronizando;
  int get pendientesCount => _pendientesCount;
  String? get ultimoError => _ultimoError;

  Future<void> inicializar() async {
    await _actualizarContador();

    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) async {
      final hayRed = results.any((r) =>
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet);
      if (hayRed) {
        // Esperar a que la red esté realmente disponible antes de sincronizar
        await Future.delayed(const Duration(seconds: 3));
        await sincronizarPendientes();
        await NotificationService.enviarTokenPendiente();
      }
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  Future<bool> hayConexion() async {
    final results = await Connectivity().checkConnectivity();
    return results.any((r) =>
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.ethernet);
  }

  Future<void> sincronizarPendientes() async {
    if (_sincronizando) return;

    final pendientes = await LocalDbService.instance.obtenerPendientes();
    if (pendientes.isEmpty) return;

    _sincronizando = true;
    _ultimoError = null;
    notifyListeners();

    for (final registro in pendientes) {
      try {
        final remoteId = await _enviarIncidente(registro);
        await LocalDbService.instance.marcarSincronizado(registro.localUuid, remoteId);
      } on AuthApiException catch (e) {
        if (e.message.contains('401') || e.message.contains('expirada')) {
          _ultimoError = 'Sesión expirada. Inicia sesión para sincronizar.';
          break;
        }
        _ultimoError = 'Error al sincronizar: ${e.message}';
        await LocalDbService.instance.marcarError(registro.localUuid, e.message);
      } catch (e) {
        _ultimoError = 'Sin conexión. Toca REINTENTAR cuando tengas señal.';
        await LocalDbService.instance.marcarError(registro.localUuid, e.toString());
      }
    }

    _sincronizando = false;
    await _actualizarContador();
    notifyListeners();
  }

  Future<int> _enviarIncidente(IncidentePendiente registro) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/incidentes');
    final datos = registro.datos;

    final request = http.MultipartRequest('POST', uri);
    headers.remove('Content-Type');
    request.headers.addAll(headers);

    request.fields['vehiculo_id'] = datos['vehiculo_id'].toString();
    request.fields['latitud'] = datos['latitud'].toString();
    request.fields['longitud'] = datos['longitud'].toString();
    request.fields['prioridad'] = (datos['prioridad'] as String?) ?? 'media';
    request.fields['client_request_id'] = registro.localUuid;

    final descripcion = datos['descripcion'] as String?;
    if (descripcion != null && descripcion.isNotEmpty) {
      request.fields['descripcion'] = descripcion;
    }

    final imagenPath = datos['imagen_frontal_path'] as String?;
    if (imagenPath != null && await File(imagenPath).exists()) {
      request.files.add(
        await http.MultipartFile.fromPath('imagen_frontal', imagenPath),
      );
    }

    final audioPath = datos['audio_path'] as String?;
    if (audioPath != null && await File(audioPath).exists()) {
      request.files.add(
        await http.MultipartFile.fromPath('audio', audioPath),
      );
    }

    final streamed = await request.send().timeout(const Duration(seconds: 30));
    final response = await http.Response.fromStream(streamed);

    if (response.statusCode == 401) {
      throw AuthApiException('401 Sesión expirada');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      final id = body['id'];
      if (id == null) throw Exception('Respuesta sin ID del servidor');
      return id as int;
    }

    throw Exception('Error HTTP ${response.statusCode}');
  }

  Future<void> _actualizarContador() async {
    _pendientesCount = await LocalDbService.instance.contarPendientesSinEnviar();
    notifyListeners();
  }

  Future<void> reintentarErrores() async {
    await LocalDbService.instance.reintentarErrores();
    await sincronizarPendientes();
  }

  Future<void> actualizarContador() async {
    await _actualizarContador();
  }
}
