import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_theme.dart';
import '../../../services/cliente_websocket_service.dart';
import '../../../services/osrm_service.dart';
import '../../cotizaciones/pages/cotizaciones_page.dart';
import '../../dashboard/pages/client_dashboard_page.dart';
import '../../dashboard/widgets/progress_timeline.dart';
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
  bool _isMapReady = false;

  // Datos del incidente
  IncidentModel? _incidente;

  // Datos en tiempo real
  String _estadoActual = 'pendiente';
  String? _tecnicoNombre;
  String? _tecnicoTelefono;
  double? _tecnicoLat;
  double? _tecnicoLng;
  double _distanciaRestante = 0;
  int _tiempoEstimadoMinutos = 0;

  bool _conectado = false;
  bool _cargandoInicial = true;
  bool _cancelando = false;

  final ClienteWebSocketService _wsService = ClienteWebSocketService();

  // ──────────────────────────────────────────────
  // Mapas estado → progreso / texto / color
  // ──────────────────────────────────────────────
  static const Map<String, double> _progresoPorEstado = {
    'pendiente': 0.15,
    'taller_asignado': 0.35,
    'en_camino': 0.6,
    'en_proceso': 0.6,
    'en_atencion': 0.8,
    'atencion': 0.8,
    'atendido': 0.9,
    'finalizado': 1.0,
    'cancelado': 0.0,
  };

  static const Map<String, String> _textoPorEstado = {
    'pendiente': 'Buscando taller disponible',
    'taller_asignado': 'Taller asignado',
    'en_camino': 'Técnico en camino',
    'en_proceso': 'Técnico en camino',
    'en_atencion': 'En atención',
    'atencion': 'En atención',
    'atendido': 'Servicio atendido',
    'finalizado': 'Servicio finalizado',
    'cancelado': 'Emergencia cancelada',
  };

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _cargarDatosIniciales();
    _initWebSocket();
  }

  @override
  void dispose() {
    // No desconectar el WS — mantiene la conexión en background
    super.dispose();
  }

  // ──────────────────────────────────────────────
  // Carga inicial
  // ──────────────────────────────────────────────
  Future<void> _cargarDatosIniciales() async {
    setState(() => _cargandoInicial = true);
    try {
      final data = await IncidenteApiService.instance.getIncidenteActivo();
      if (data != null && mounted) {
        final modelo = IncidentModel.fromJson(data);
        setState(() {
          _incidente = modelo;
          _estadoActual = modelo.estado;
          _tecnicoNombre = data['tecnico']?['nombre'];
          _tecnicoTelefono = data['tecnico']?['telefono'];
          _tecnicoLat = (data['tecnico']?['latitud'] as num?)?.toDouble();
          _tecnicoLng = (data['tecnico']?['longitud'] as num?)?.toDouble();
        });
        if (_tecnicoLat != null && _tecnicoLng != null) await _loadRoute();
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _cargandoInicial = false);
    }
  }

  // ──────────────────────────────────────────────
  // WebSocket
  // ──────────────────────────────────────────────
  void _initWebSocket() {
    _wsService.connect(widget.incidenteId.toString());

    _wsService.onEstadoCambio.listen((data) async {
      if (!mounted) return;
      final nuevoEstado = data['estado'] as String? ?? _estadoActual;
      setState(() {
        _estadoActual = nuevoEstado;
        _conectado = true;
        if (data['tecnico_nombre'] != null) _tecnicoNombre = data['tecnico_nombre'];
        if (data['tecnico_telefono'] != null) _tecnicoTelefono = data['tecnico_telefono'];
      });

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('incidente_activo_estado', nuevoEstado);

      if (nuevoEstado == 'finalizado' || nuevoEstado == 'cancelado') {
        await _limpiarIncidenteLocal();
        if (mounted && nuevoEstado == 'cancelado') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('La emergencia fue cancelada por el taller'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 4),
            ),
          );
          Navigator.of(context).pushNamedAndRemoveUntil(
            ClientDashboardPage.routeName,
            (route) => false,
          );
        }
      }
    });

    _wsService.onUbicacionTecnico.listen((data) async {
      if (!mounted) return;
      setState(() {
        _tecnicoNombre = data['tecnico_nombre'];
        _tecnicoTelefono = data['tecnico_telefono'];
        _tecnicoLat = (data['latitud'] as num?)?.toDouble();
        _tecnicoLng = (data['longitud'] as num?)?.toDouble();
        _conectado = true;
      });
      await _loadRoute();
    });
  }

  // ──────────────────────────────────────────────
  // Ruta OSRM
  // ──────────────────────────────────────────────
  Future<void> _loadRoute() async {
    if (_tecnicoLat == null || _tecnicoLng == null) return;
    final result = await OSRMService.getRoute(
      _tecnicoLat!,
      _tecnicoLng!,
      widget.incidenteLat,
      widget.incidenteLng,
    );
    if (!mounted) return;
    setState(() {
      _routePoints = result['points'];
      _distanciaRestante = result['distance'];
      _tiempoEstimadoMinutos = result['duration'].ceil();
      if (_tiempoEstimadoMinutos < 1) _tiempoEstimadoMinutos = 1;
      _isMapReady = true;
    });
    if (_routePoints.isNotEmpty && _isMapReady) {
      try {
        _mapController.fitCamera(
          CameraFit.bounds(
            bounds: LatLngBounds.fromPoints(_routePoints),
            padding: const EdgeInsets.all(50),
          ),
        );
      } catch (_) {}
    }
  }

  // ──────────────────────────────────────────────
  // Local persistence
  // ──────────────────────────────────────────────
  Future<void> _limpiarIncidenteLocal() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('incidente_activo_id');
      await prefs.remove('incidente_activo_estado');
      await prefs.remove('incidente_activo_lat');
      await prefs.remove('incidente_activo_lng');
    } catch (_) {}
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  double get _progress => _progresoPorEstado[_estadoActual] ?? 0;
  String get _estadoTexto => _textoPorEstado[_estadoActual] ?? _estadoActual;

  Color get _estadoColor {
    switch (_estadoActual) {
      case 'pendiente':     return Colors.orange;
      case 'taller_asignado': return Colors.blue;
      case 'en_camino':
      case 'en_proceso':   return const Color(0xFF2e7d32);
      case 'atencion':
      case 'en_atencion':  return Colors.purple;
      case 'finalizado':
      case 'atendido':     return Colors.grey;
      case 'cancelado':    return Colors.red;
      default:             return Colors.grey;
    }
  }

  bool get _esPendiente =>
      _estadoActual == 'pendiente' || _estadoActual == 'taller_asignado';

  bool get _puedeClienteCancelar =>
      _estadoActual == 'pendiente' || _estadoActual == 'taller_asignado';

  String get _distanciaTexto {
    if (_distanciaRestante <= 0) return 'Calculando...';
    if (_distanciaRestante < 1) return '${(_distanciaRestante * 1000).toInt()} m';
    return '${_distanciaRestante.toStringAsFixed(1)} km';
  }

  String get _tiempoTexto {
    switch (_estadoActual) {
      case 'en_camino':
      case 'en_proceso':
        return _tiempoEstimadoMinutos > 0 ? '$_tiempoEstimadoMinutos min' : 'Calculando...';
      case 'pendiente':    return 'Buscando...';
      case 'taller_asignado': return 'Asignando técnico';
      case 'atencion':     return 'En atención';
      case 'finalizado':   return 'Completado';
      default:             return 'En proceso';
    }
  }

  String get _servicioTexto =>
      _incidente?.clasificacionIa?.toUpperCase() ?? 'ASISTENCIA';

  // ──────────────────────────────────────────────
  // Cancelar
  // ──────────────────────────────────────────────
  Future<void> _mostrarDialogoCancelar() async {
    final motivoCtrl = TextEditingController();
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
            const Text('Motivo (opcional)',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            TextField(
              controller: motivoCtrl,
              decoration: InputDecoration(
                hintText: 'Ej: Ya me ayudaron, me equivoqué...',
                hintStyle: const TextStyle(fontSize: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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
            content: Text('Emergencia cancelada correctamente'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 4),
          ),
        );
        Navigator.of(context).pushNamedAndRemoveUntil(
          ClientDashboardPage.routeName,
          (route) => false,
        );
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

  // ──────────────────────────────────────────────
  // BUILD
  // ──────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Seguimiento en vivo'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar',
            onPressed: _cargarDatosIniciales,
          ),
        ],
      ),
      body: _cargandoInicial
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildEstadoStrip(),
                _buildInfoPanel(),
                Expanded(child: _buildMapa()),
                _buildBotonesAccion(),
              ],
            ),
    );
  }

  // ──────────────────────────────────────────────
  // Barra de estado (franja coloreada)
  // ──────────────────────────────────────────────
  Widget _buildEstadoStrip() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: _estadoColor.withOpacity(0.12),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: _estadoColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _estadoTexto,
              style: TextStyle(
                color: _estadoColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          if (_conectado)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.green,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'EN VIVO',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────
  // Panel de información (gradiente azul)
  // ──────────────────────────────────────────────
  Widget _buildInfoPanel() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF005EA4), Color(0xFF0077CE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: icon + incidente # + estado badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.emergency, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Incidente #${widget.incidenteId}',
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 11),
                    ),
                    Text(
                      _estadoTexto,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              // Servicio chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _servicioTexto,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Taller y técnico (si disponibles)
          if (_incidente?.hasTaller == true && _estadoActual != 'pendiente')
            _infoRow(Icons.business, 'Taller', _incidente!.tallerNombre),
          if (_tecnicoNombre != null) ...[
            const SizedBox(height: 6),
            _infoRow(Icons.engineering, 'Técnico', _tecnicoNombre!),
            if (_tecnicoTelefono != null && _tecnicoTelefono!.isNotEmpty) ...[
              const SizedBox(height: 4),
              _infoRow(Icons.phone, 'Contacto', _tecnicoTelefono!),
            ],
          ],
          const SizedBox(height: 12),

          // Stats: distancia + tiempo
          Row(
            children: [
              _statPill(Icons.straighten, _distanciaTexto),
              const SizedBox(width: 8),
              _statPill(Icons.access_time, _tiempoTexto),
            ],
          ),
          const SizedBox(height: 12),

          // Barra de progreso
          ProgressTimeline(
            progress: _progress,
            stages: const ['Asignado', 'En camino', 'Atendiendo'],
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 16),
        const SizedBox(width: 6),
        Text(
          '$label: ',
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
                color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _statPill(IconData icon, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white70, size: 13),
          const SizedBox(width: 5),
          Text(
            value,
            style: const TextStyle(
                color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────
  // Mapa
  // ──────────────────────────────────────────────
  Widget _buildMapa() {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: LatLng(widget.incidenteLat, widget.incidenteLng),
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
                  points: _routePoints, color: Colors.blue, strokeWidth: 4),
            ],
          ),
        MarkerLayer(markers: [
          // Marcador del incidente (rojo)
          Marker(
            point: LatLng(widget.incidenteLat, widget.incidenteLng),
            width: 40,
            height: 40,
            child: _mapPin(Colors.red, Icons.location_on),
          ),
          // Marcador del técnico (azul, si disponible)
          if (_tecnicoLat != null && _tecnicoLng != null)
            Marker(
              point: LatLng(_tecnicoLat!, _tecnicoLng!),
              width: 40,
              height: 40,
              child: _mapPin(Colors.blue, Icons.directions_car),
            ),
        ]),
      ],
    );
  }

  Widget _mapPin(Color color, IconData icon) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: const [BoxShadow(blurRadius: 4, color: Colors.black26)],
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    );
  }

  // ──────────────────────────────────────────────
  // Botones de acción (abajo del mapa)
  // ──────────────────────────────────────────────
  Widget _buildBotonesAccion() {
    final tieneBotones = _esPendiente || _puedeClienteCancelar;
    if (!tieneBotones) return const SizedBox.shrink();

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_esPendiente && _incidente != null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CotizacionesPage(
                          incidenteId: _incidente!.id,
                          incidenteLat: _incidente!.latitud,
                          incidenteLng: _incidente!.longitud,
                        ),
                      ),
                    ).then((_) => _cargarDatosIniciales());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFF8F06),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.request_quote, size: 18),
                  label: const Text('Ver cotizaciones de talleres',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            if (_esPendiente && _puedeClienteCancelar)
              const SizedBox(height: 8),
            if (_puedeClienteCancelar)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _cancelando ? null : _mostrarDialogoCancelar,
                  icon: _cancelando
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.red),
                        )
                      : const Icon(Icons.cancel_outlined, size: 18),
                  label: Text(
                    _cancelando ? 'Cancelando...' : 'Cancelar emergencia',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
