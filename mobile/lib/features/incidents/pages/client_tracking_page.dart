import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_theme.dart';
import '../../../services/cliente_websocket_service.dart';
import '../../../services/osrm_service.dart';
import '../models/incident_model.dart';
import '../services/incidente_api_service.dart';

class ClientTrackingPage extends StatefulWidget {
  final int incidenteId;
  final double incidenteLat;
  final double incidenteLng;

  const ClientTrackingPage({
    super.key,
    required this.incidenteId,
    required this.incidenteLat,
    required this.incidenteLng,
  });

  @override
  State<ClientTrackingPage> createState() => _ClientTrackingPageState();
}

class _ClientTrackingPageState extends State<ClientTrackingPage> {
  // Mapa
  late final MapController _mapController;
  List<LatLng> _routePoints = [];
  bool _isLoadingRoute = false;
  bool _isMapReady = false;

  // Datos del técnico
  String? _tecnicoNombre;
  String? _tecnicoTelefono;
  double? _tecnicoLat;
  double? _tecnicoLng;
  String _estadoActual = 'pendiente';
  double _distanciaRestante = 0;
  int _tiempoEstimadoMinutos = 0;

  // Estado
  bool _conectado = false;
  bool _cargandoInicial = true;
  bool _cancelando = false;
  final ClienteWebSocketService _wsService = ClienteWebSocketService();

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _cargarDatosIniciales();
    _initWebSocket();
  }

  @override
  void dispose() {
    // No desconectar el WebSocket para mantener la conexión
    super.dispose();
  }

  Future<void> _cargarDatosIniciales() async {
    setState(() => _cargandoInicial = true);

    try {
      // Recargar incidente activo desde el backend
      final data = await IncidenteApiService.instance.getIncidenteActivo();
      if (data != null && mounted) {
        setState(() {
          _estadoActual = data['estado'] ?? 'pendiente';
          _tecnicoNombre = data['tecnico']?['nombre'];
          _tecnicoTelefono = data['tecnico']?['telefono'];
          _tecnicoLat = data['tecnico']?['latitud'];
          _tecnicoLng = data['tecnico']?['longitud'];
        });

        // Si ya hay ubicación del técnico, cargar ruta
        if (_tecnicoLat != null && _tecnicoLng != null) {
          await _loadRoute();
        }
      }
    } catch (e) {
      print('❌ Error cargando datos iniciales: $e');
    } finally {
      if (mounted) setState(() => _cargandoInicial = false);
    }
  }

  Future<void> _guardarIncidenteLocalmente() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('incidente_activo_id', widget.incidenteId);
      await prefs.setString('incidente_activo_estado', _estadoActual);
      await prefs.setDouble('incidente_activo_lat', widget.incidenteLat);
      await prefs.setDouble('incidente_activo_lng', widget.incidenteLng);
    } catch (e) {
      print('❌ Error guardando incidente localmente: $e');
    }
  }

  Future<void> _limpiarIncidenteLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('incidente_activo_id');
      await prefs.remove('incidente_activo_estado');
      await prefs.remove('incidente_activo_lat');
      await prefs.remove('incidente_activo_lng');
    } catch (e) {
      print('❌ Error limpiando incidente local: $e');
    }
  }

  void _initWebSocket() {
    _wsService.connect(widget.incidenteId.toString());

    _wsService.onEstadoCambio.listen((data) async {
      if (mounted) {
        final nuevoEstado = data['estado'];
        print('📌 Estado actualizado a: $nuevoEstado');

        setState(() {
          _estadoActual = nuevoEstado;
          if (data['tecnico_nombre'] != null) {
            _tecnicoNombre = data['tecnico_nombre'];
          }
          if (data['tecnico_telefono'] != null) {
            _tecnicoTelefono = data['tecnico_telefono'];
          }
        });

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('incidente_activo_estado', nuevoEstado);

        if (nuevoEstado == 'finalizado' || nuevoEstado == 'cancelado') {
          await _limpiarIncidenteLocal();
          if (mounted && nuevoEstado == 'cancelado') {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('La emergencia fue cancelada'),
                backgroundColor: Colors.red,
                duration: Duration(seconds: 3),
              ),
            );
            await Future.delayed(const Duration(seconds: 2));
            if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
          }
        }
      }
    });

    _wsService.onUbicacionTecnico.listen((data) async {
      print('📍 Ubicación técnico recibida: ${data['tecnico_nombre']}');
      if (mounted) {
        setState(() {
          _tecnicoNombre = data['tecnico_nombre'];
          _tecnicoTelefono = data['tecnico_telefono'];
          _tecnicoLat = data['latitud'];
          _tecnicoLng = data['longitud'];
          _conectado = true;
        });
        await _loadRoute();
      }
    });
  }

  Future<void> _loadRoute() async {
    if (_tecnicoLat == null || _tecnicoLng == null) return;

    setState(() => _isLoadingRoute = true);

    final result = await OSRMService.getRoute(
      _tecnicoLat!,
      _tecnicoLng!,
      widget.incidenteLat,
      widget.incidenteLng,
    );

    if (mounted) {
      setState(() {
        _routePoints = result['points'];
        _distanciaRestante = result['distance'];
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

  String _formatDistancia(double km) {
    if (km < 1) return '${(km * 1000).toInt()} m';
    return '${km.toStringAsFixed(1)} km';
  }

  String _getEstadoTexto() {
    switch (_estadoActual) {
      case 'pendiente':
        return '🟡 Buscando taller disponible';
      case 'taller_asignado':
        return '🔵 Taller asignado';
      case 'en_camino':
        return '🚐 Técnico en camino';
      case 'en_proceso':
        return '🚐 Técnico en camino';
      case 'atencion':
        return '🔧 En atención';
      case 'finalizado':
        return '✅ Servicio finalizado';
      case 'cancelado':
        return '❌ Emergencia cancelada';
      default:
        return _estadoActual;
    }
  }

  Color _getEstadoColor() {
    switch (_estadoActual) {
      case 'pendiente':
        return Colors.orange;
      case 'taller_asignado':
        return Colors.blue;
      case 'en_camino':
      case 'en_proceso':
        return Colors.green;
      case 'atencion':
        return Colors.orange;
      case 'finalizado':
        return Colors.grey;
      case 'cancelado':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  bool get _puedeClienteCancelar =>
      _estadoActual == 'pendiente' || _estadoActual == 'taller_asignado';

  Future<void> _mostrarDialogoCancelar() async {
    final TextEditingController motivoCtrl = TextEditingController();

    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.cancel_outlined, color: Colors.red, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Cancelar emergencia', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade700, size: 18),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'El taller será notificado de la cancelación.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text('Motivo (opcional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: motivoCtrl,
              decoration: InputDecoration(
                hintText: 'Ej: Ya me ayudaron, me equivoqué...',
                hintStyle: const TextStyle(fontSize: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              ),
              maxLines: 2,
              style: const TextStyle(fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Volver'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.cancel, size: 16),
            label: const Text('Confirmar'),
            onPressed: () => Navigator.pop(ctx, true),
          ),
        ],
      ),
    );

    if (confirmar != true || !mounted) return;

    setState(() => _cancelando = true);
    try {
      await IncidenteApiService.instance.cancelarIncidente(
        widget.incidenteId,
        motivo: motivoCtrl.text.trim().isEmpty ? null : motivoCtrl.text.trim(),
      );
      await _limpiarIncidenteLocal();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Emergencia cancelada'),
            backgroundColor: Colors.red,
          ),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _cancelando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Seguimiento en vivo'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => _cargarDatosIniciales(),
          ),
        ],
      ),
      body: _cargandoInicial
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Barra de estado
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  color: _getEstadoColor().withOpacity(0.1),
                  child: Row(
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: _getEstadoColor(),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _getEstadoTexto(),
                          style: TextStyle(
                            color: _getEstadoColor(),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (_conectado)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'EN VIVO',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Mensaje cuando no hay técnico asignado
                if (_tecnicoNombre == null &&
                    _estadoActual != 'pendiente' &&
                    _estadoActual != 'finalizado')
                  Container(
                    padding: const EdgeInsets.all(12),
                    color: Colors.orange.shade50,
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.orange.shade700),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Esperando que el taller asigne un técnico...',
                            style: TextStyle(color: Colors.orange.shade700),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Tarjeta de información del técnico
                if (_tecnicoNombre != null)
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
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
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
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
                                  ),
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
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.engineering, color: Colors.blue),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Técnico asignado',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    Text(
                                      _tecnicoNombre ?? 'Asignando...',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    if (_tecnicoTelefono != null)
                                      Text(
                                        _tecnicoTelefono!,
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                // Botón cancelar (solo en estados cancelables)
                if (_puedeClienteCancelar)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        onPressed: _cancelando ? null : _mostrarDialogoCancelar,
                        icon: _cancelando
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.red,
                                ),
                              )
                            : const Icon(Icons.cancel_outlined, size: 18),
                        label: Text(
                          _cancelando ? 'Cancelando...' : 'Cancelar emergencia',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ),

                // Mapa
                Expanded(
                  child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: LatLng(
                        widget.incidenteLat,
                        widget.incidenteLng,
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
                              widget.incidenteLat,
                              widget.incidenteLng,
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
                      if (_tecnicoLat != null && _tecnicoLng != null)
                        MarkerLayer(
                          markers: [
                            Marker(
                              point: LatLng(_tecnicoLat!, _tecnicoLng!),
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
              ],
            ),
    );
  }
}
