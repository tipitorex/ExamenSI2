import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../cotizaciones/pages/cotizaciones_page.dart';
import '../../incidents/models/incident_model.dart';
import '../../incidents/pages/client_tracking_page.dart';
import '../../incidents/services/incidente_api_service.dart';

class ActiveIncidentTracker extends StatefulWidget {
  const ActiveIncidentTracker({super.key});

  @override
  State<ActiveIncidentTracker> createState() => _ActiveIncidentTrackerState();
}

class _ActiveIncidentTrackerState extends State<ActiveIncidentTracker> {
  IncidentModel? _incidente;
  bool _cargando = true;

  static const Map<String, String> _textoPorEstado = {
    'pendiente': 'Buscando taller disponible',
    'taller_asignado': 'Taller asignado',
    'en_camino': 'Técnico en camino',
    'en_proceso': 'Técnico en camino',
    'en_atencion': 'En atención',
    'atencion': 'En atención',
    'atendido': 'Servicio atendido',
    'finalizado': 'Servicio finalizado',
    'cancelado': 'Cancelado',
  };

  static const Map<String, Color> _colorPorEstado = {
    'pendiente': Colors.orange,
    'taller_asignado': Colors.blue,
    'en_camino': Color(0xFF2e7d32),
    'en_proceso': Color(0xFF2e7d32),
    'en_atencion': Colors.purple,
    'atencion': Colors.purple,
    'atendido': Colors.grey,
    'finalizado': Colors.grey,
    'cancelado': Colors.red,
  };

  @override
  void initState() {
    super.initState();
    _cargarIncidente();
  }

  Future<void> _cargarIncidente() async {
    setState(() => _cargando = true);
    try {
      final data = await IncidenteApiService.instance.getIncidenteActivo();
      if (!mounted) return;
      setState(() {
        _incidente = data != null ? IncidentModel.fromJson(data) : null;
      });
    } catch (_) {
      if (mounted) setState(() => _incidente = null);
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  bool get _esPendiente =>
      _incidente?.estado == 'pendiente' ||
      _incidente?.estado == 'taller_asignado';

  String get _estadoTexto =>
      _textoPorEstado[_incidente?.estado ?? ''] ?? (_incidente?.estado ?? '');

  Color get _estadoColor =>
      _colorPorEstado[_incidente?.estado ?? ''] ?? Colors.grey;

  @override
  Widget build(BuildContext context) {
    if (_cargando) return _buildShimmer();
    if (_incidente == null) return _buildEmptyState(context);
    return _buildCard(context);
  }

  // ──────────────────────────────────────────────
  // Tarjeta con incidente activo
  // ──────────────────────────────────────────────
  Widget _buildCard(BuildContext context) {
    final inc = _incidente!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF005EA4), Color(0xFF0077CE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x29001C38),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.emergency, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Incidente Activo',
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                    Text(
                      _estadoTexto,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              // Badge de estado
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: _estadoColor.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  (inc.estado).toUpperCase().replaceAll('_', ' '),
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // ── Info secundaria ──────────────────────
          Row(
            children: [
              _infoChip(Icons.category,
                  inc.clasificacionIa?.toUpperCase() ?? 'ASISTENCIA'),
              const SizedBox(width: 8),
              if (inc.hasTaller && inc.estado != 'pendiente')
                Expanded(
                  child: _infoChip(Icons.business, inc.tallerNombre),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // ── Botones de acción ─────────────────────
          Row(
            children: [
              if (_esPendiente)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => CotizacionesPage(
                            incidenteId: inc.id,
                            incidenteLat: inc.latitud,
                            incidenteLng: inc.longitud,
                          ),
                        ),
                      ).then((_) => _cargarIncidente());
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF8F06),
                      foregroundColor: Colors.white,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.request_quote, size: 16),
                    label: const Text('Cotizaciones',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              if (_esPendiente) const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ClientTrackingPage(
                          incidenteId: inc.id,
                          incidenteLat: inc.latitud,
                          incidenteLng: inc.longitud,
                        ),
                      ),
                    ).then((_) => _cargarIncidente());
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.near_me, size: 16),
                  label: const Text('Ver mapa',
                      style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.14),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white70, size: 12),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
                color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────
  // Estado vacío (sin incidente activo)
  // ──────────────────────────────────────────────
  Widget _buildEmptyState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline, size: 44, color: Colors.grey),
          const SizedBox(height: 10),
          const Text(
            'No hay incidentes activos',
            style: TextStyle(
                fontSize: 15, fontWeight: FontWeight.w600, color: Colors.grey),
          ),
          const SizedBox(height: 4),
          const Text(
            'Todos los incidentes están resueltos',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton.icon(
                onPressed: _cargarIncidente,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Actualizar'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF005EA4),
                  side: const BorderSide(color: Color(0xFF005EA4)),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                onPressed: () =>
                    Navigator.pushNamed(context, '/reportar-incidente'),
                icon: const Icon(Icons.add_alert, size: 16),
                label: const Text('Reportar'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFF8F06),
                  foregroundColor: Colors.white,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ──────────────────────────────────────────────
  // Shimmer de carga
  // ──────────────────────────────────────────────
  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        height: 160,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    );
  }
}
