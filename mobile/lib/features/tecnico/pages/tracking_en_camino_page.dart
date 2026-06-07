import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../services/tecnico_websocket_service.dart';
import '../../../services/osrm_service.dart';
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
  String _estadoActual = 'en_camino';
  double _distanciaRestante = 0;
  double _distanciaInicial = 0;
  int _tiempoEstimadoMinutos = 0;

  // Para el mapa
  late final MapController _mapController;
  List<LatLng> _routePoints = [];
  bool _isLoadingRoute = true;
  bool _isMapReady = false;

  @override
  void initState() {
    super.initState();
    print('🔵 TrackingEnCaminoPage initState');
    _mapController = MapController();
    _estadoActual = widget.asignacion.estado == 'atencion' ? 'atencion' : 'en_camino';
    _initTracking();
  }

  @override
  void dispose() {
    print('🔴 TrackingEnCaminoPage dispose');
    _locationTimer?.cancel();
    _locationTimer = null;
    super.dispose();
  }

  Future<void> _initTracking() async {
    print('🔵 _initTracking() iniciado');

    // Conectar WebSocket si no está conectado
    if (!TecnicoWebSocketService().isConnected) {
      print('🔌 Conectando WebSocket...');
      TecnicoWebSocketService().connect(
        widget.asignacion.incidenteId.toString(),
      );
      // Esperar a que se conecte
      await Future.delayed(const Duration(milliseconds: 500));
    } else {
      print('✅ WebSocket ya conectado');
    }

    // Solicitar permiso de ubicación
    final status = await Permission.location.request();
    print(
      '📍 Permiso de ubicación: ${status.isGranted ? "GRANTED" : "DENIED"}',
    );

    if (status.isGranted) {
      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
        );
        print(
          '📍 Ubicación inicial obtenida: ${position.latitude}, ${position.longitude}',
        );

        if (mounted) {
          setState(() {
            _currentPosition = position;
          });
        }

        print('🔄 Cargando ruta...');
        await _loadRoute();

        // ✅ INICIAR EL ENVÍO DE UBICACIÓN ANTES DEL TIMER
        print('📍 Iniciando startSendingLocation...');
        TecnicoWebSocketService().startSendingLocation(
          position.latitude,
          position.longitude,
          intervalSeconds: 20,
        );

        print('🔄 Iniciando envío continuo de ubicación...');
        _startContinuousLocation();

        print('✅ _initTracking() completado');
      } catch (e) {
        print('❌ Error en _initTracking: $e');
      }
    } else {
      print('❌ Permiso de ubicación denegado');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Se necesita permiso de ubicación para continuar'),
          ),
        );
      }
    }
  }

  Future<void> _loadRoute() async {
    if (_currentPosition == null) return;
    print('🔄 _loadRoute() iniciado');

    if (mounted) {
      setState(() => _isLoadingRoute = true);
    }

    final result = await OSRMService.getRoute(
      _currentPosition!.latitude,
      _currentPosition!.longitude,
      widget.asignacion.latitud,
      widget.asignacion.longitud,
    );

    print(
      '📡 Ruta recibida: ${result['points'].length} puntos, distancia: ${result['distance']} km',
    );

    if (mounted) {
      setState(() {
        _routePoints = result['points'];
        _distanciaRestante = result['distance'];
        _distanciaInicial = _distanciaRestante;
        _tiempoEstimadoMinutos = result['duration'].ceil();
        if (_tiempoEstimadoMinutos < 1) _tiempoEstimadoMinutos = 1;
        _isLoadingRoute = false;
        _isMapReady = true;
      });
    }

    if (_routePoints.isNotEmpty && mounted && _isMapReady) {
      try {
        _mapController.fitCamera(
          CameraFit.bounds(
            bounds: LatLngBounds.fromPoints(_routePoints),
            padding: const EdgeInsets.all(50),
          ),
        );
        print('✅ Mapa centrado en la ruta');
      } catch (e) {
        print('Error centrando mapa: $e');
      }
    }
  }

  void _startContinuousLocation() {
    print('📍 _startContinuousLocation() llamado');
    print(
      '📍 isSendingLocation: ${TecnicoWebSocketService().isSendingLocation}',
    );

    _locationTimer = Timer.periodic(const Duration(seconds: 20), (timer) async {
      print('📍 Timer ejecutándose (cada 20 segundos)');

      if (!mounted) {
        print('❌ Widget no montado, cancelando timer');
        timer.cancel();
        return;
      }

      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
        );

        print(
          '📍 Nueva ubicación obtenida: ${position.latitude}, ${position.longitude}',
        );

        if (mounted) {
          setState(() {
            _currentPosition = position;
          });
          await _loadRoute();
        }

        // ✅ Solo actualizar ubicación, no iniciar envío
        print('📍 Actualizando ubicación en WebSocket...');
        TecnicoWebSocketService().updateLocation(
          position.latitude,
          position.longitude,
        );
      } catch (e) {
        print('❌ Error obteniendo ubicación: $e');
      }
    });

    print('✅ Timer de ubicación iniciado');
  }

  Future<void> _marcarAtencion() async {
    setState(() => _isLoading = true);
    try {
      await TecnicoApiService.instance.actualizarEstado(
        widget.asignacion.incidenteId,
        'atencion',
      );
      _locationTimer?.cancel();
      _locationTimer = null;
      _isSendingLocation = false;
      TecnicoWebSocketService().stopSendingLocation();
      if (mounted) setState(() { _estadoActual = 'atencion'; _isLoading = false; });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _finalizarServicio() async {
    print('🛑 _finalizarServicio() llamado');
    if (!mounted) return;

    _locationTimer?.cancel();
    _locationTimer = null;
    _isSendingLocation = false;

    TecnicoWebSocketService().stopSendingLocation();
    TecnicoWebSocketService().disconnect();

    setState(() => _isLoading = true);

    try {
      await TecnicoApiService.instance.actualizarEstado(
        widget.asignacion.incidenteId,
        'finalizado',
      );
      print('✅ Estado actualizado a finalizado');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Servicio finalizado'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      print('❌ Error finalizando servicio: $e');
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
          SizedBox(
            height: 4,
            child: LinearProgressIndicator(
              value: progreso,
              backgroundColor: Colors.grey.shade300,
              color: Colors.green,
            ),
          ),

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

          Expanded(
            child: _isLoadingRoute
                ? const Center(child: CircularProgressIndicator())
                : FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: _routePoints.isNotEmpty
                          ? _routePoints.first
                          : LatLng(
                              widget.asignacion.latitud,
                              widget.asignacion.longitud,
                            ),
                      initialZoom: 13,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate:
                            'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                        subdomains: const ['a', 'b', 'c'],
                        userAgentPackageName: 'com.example.mobile',
                        retinaMode: false,
                      ),
                      if (_routePoints.isNotEmpty)
                        PolylineLayer(
                          polylines: [
                            Polyline(
                              points: _routePoints,
                              color: Colors.blue,
                              strokeWidth: 4,
                            ),
                          ],
                        ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(
                              widget.asignacion.latitud,
                              widget.asignacion.longitud,
                            ),
                            width: 40,
                            height: 40,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 2,
                                ),
                                boxShadow: const [
                                  BoxShadow(
                                    blurRadius: 4,
                                    color: Colors.black26,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.location_on,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_currentPosition != null)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(
                                _currentPosition!.latitude,
                                _currentPosition!.longitude,
                              ),
                              width: 40,
                              height: 40,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.blue,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                  boxShadow: const [
                                    BoxShadow(
                                      blurRadius: 4,
                                      color: Colors.black26,
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.directions_car,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
          ),

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
            child: _isLoading
                ? const Center(
                    child: SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  )
                : _estadoActual == 'en_camino'
                    ? SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _marcarAtencion,
                          icon: const Icon(Icons.handyman),
                          label: const Text(
                            'He llegado — Iniciar Atención',
                            style: TextStyle(fontSize: 16),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.shade600,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      )
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              vertical: 10,
                              horizontal: 16,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.build_circle,
                                    color: Colors.green.shade700),
                                const SizedBox(width: 8),
                                Text(
                                  'En atención — realiza el servicio',
                                  style: TextStyle(
                                      color: Colors.green.shade800,
                                      fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _finalizarServicio,
                              icon: const Icon(Icons.check_circle),
                              label: const Text(
                                'Finalizar Servicio',
                                style: TextStyle(fontSize: 16),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red.shade700,
                                foregroundColor: Colors.white,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
          ),
        ],
      ),
    );
  }
}
