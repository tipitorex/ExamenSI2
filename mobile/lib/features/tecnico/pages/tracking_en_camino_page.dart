import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_stripe/flutter_stripe.dart' as stripe;

import '../../../core/theme/app_theme.dart';
import '../../../services/tecnico_websocket_service.dart';
import '../models/asignacion_tecnico_model.dart';
import '../services/tecnico_api_service.dart';

class TrackingEnCaminoPage extends StatefulWidget {
  final AsignacionTecnico asignacion;

  const TrackingEnCaminoPage({super.key, required this.asignacion});

  @override
  State<TrackingEnCaminoPage> createState() => _TrackingEnCaminoPageState();
}

class _TrackingEnCaminoPageState extends State<TrackingEnCaminoPage> {
  Position? _currentPosition;
  Timer? _locationTimer;
  bool _isSendingLocation = true;
  bool _isLoading = false;
  double _distanciaRestante = 0;
  double _distanciaInicial = 0;
  int _tiempoEstimadoMinutos = 0;

  @override
  void initState() {
    super.initState();
    _initTracking();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    TecnicoWebSocketService().stopSendingLocation();
    super.dispose();
  }

  Future<void> _initTracking() async {
    // Conectar WebSocket
    TecnicoWebSocketService().connect(widget.asignacion.incidenteId.toString());

    // Obtener ubicación inicial
    final status = await Permission.location.request();
    if (status.isGranted) {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );

      setState(() {
        _currentPosition = position;
      });

      // Calcular distancia inicial
      _distanciaInicial = _calcularDistancia(
        position.latitude,
        position.longitude,
        widget.asignacion.latitud,
        widget.asignacion.longitud,
      );

      _startContinuousLocation();
    }
  }

  void _startContinuousLocation() {
    // Calcular distancia inicial si no se hizo
    if (_distanciaInicial == 0 && _currentPosition != null) {
      _distanciaInicial = _calcularDistancia(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        widget.asignacion.latitud,
        widget.asignacion.longitud,
      );
    }

    // Calcular distancia y tiempo inicial
    _calcularDistanciaYTiempo();

    _locationTimer = Timer.periodic(const Duration(seconds: 20), (timer) async {
      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
        );

        if (mounted) {
          setState(() {
            _currentPosition = position;
          });
        }

        if (_isSendingLocation) {
          TecnicoWebSocketService().updateLocation(
            position.latitude,
            position.longitude,
          );
        }

        // Recalcular distancia
        _calcularDistanciaYTiempo();
      } catch (e) {
        print('❌ Error obteniendo ubicación: $e');
      }
    });
  }

  void _calcularDistanciaYTiempo() {
    if (_currentPosition == null) return;

    final distancia = _calcularDistancia(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      widget.asignacion.latitud,
      widget.asignacion.longitud,
    );

    setState(() {
      _distanciaRestante = distancia;
      // Velocidad promedio 30 km/h -> 2 minutos por km
      _tiempoEstimadoMinutos = (distancia * 2).ceil();
      if (_tiempoEstimadoMinutos < 1) _tiempoEstimadoMinutos = 1;
    });
  }

  double _calcularDistancia(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const double R = 6371; // Radio de la Tierra en km
    final dLat = _toRadians(lat2 - lat1);
    final dLng = _toRadians(lng2 - lng1);
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) *
            math.cos(_toRadians(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  double _toRadians(double degrees) => degrees * math.pi / 180;

  Future<void> _finalizarServicio() async {
    setState(() => _isLoading = true);

    try {
      await TecnicoApiService.instance.actualizarEstado(
        widget.asignacion.incidenteId,
        'finalizado',
      );

      TecnicoWebSocketService().stopSendingLocation();
      TecnicoWebSocketService().disconnect();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Servicio finalizado'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
        Navigator.pop(context); // Volver al dashboard
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _abrirGoogleMaps() async {
    if (_currentPosition == null) return;

    final url =
        'https://www.google.com/maps/dir/${_currentPosition!.latitude},${_currentPosition!.longitude}/${widget.asignacion.latitud},${widget.asignacion.longitud}';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  String _formatDistancia(double km) {
    if (km < 1) return '${(km * 1000).toInt()} m';
    return '${km.toStringAsFixed(1)} km';
  }

  @override
  Widget build(BuildContext context) {
    // Calcular progreso para la barra
    double progreso = 0;
    if (_distanciaInicial > 0 && _distanciaRestante >= 0) {
      progreso = 1 - (_distanciaRestante / _distanciaInicial);
      if (progreso < 0) progreso = 0;
      if (progreso > 1) progreso = 1;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('En camino'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () {
              showDialog(
                context: context,
                builder: (_) => AlertDialog(
                  title: const Text('¿Necesitas ayuda?'),
                  content: const Text(
                    'Puedes contactar al taller o al cliente desde aquí.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cerrar'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de progreso superior - CORREGIDA
          SizedBox(
            height: 4,
            child: LinearProgressIndicator(
              value: progreso,
              backgroundColor: Colors.grey.shade300,
              color: Colors.green,
            ),
          ),

          // Tarjeta de información principal
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Distancia restante',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDistancia(_distanciaRestante),
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primary,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'Tiempo estimado',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$_tiempoEstimadoMinutos min',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Destino',
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey,
                              ),
                            ),
                            Text(
                              widget.asignacion.direccion.isNotEmpty
                                  ? widget.asignacion.direccion
                                  : 'Incidente #${widget.asignacion.incidenteId}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _abrirGoogleMaps,
                        icon: const Icon(Icons.navigation),
                        tooltip: 'Abrir en Google Maps',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Mapa (placeholder visual)
          Expanded(
            child: Container(
              color: Colors.grey.shade200,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.map, size: 64, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    Text(
                      'Mapa en tiempo real',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Usa "Abrir en Maps" para navegación',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Botón de finalizar servicio
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.shade300,
                  blurRadius: 8,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _finalizarServicio,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade700,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle),
                          SizedBox(width: 8),
                          Text(
                            'Finalizar Servicio',
                            style: TextStyle(fontSize: 16),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
