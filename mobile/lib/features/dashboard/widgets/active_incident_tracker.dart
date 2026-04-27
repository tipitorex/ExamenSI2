import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../incidents/services/incidente_api_service.dart';
import '../../incidents/models/incident_model.dart';
import '../../incidents/pages/incident_detail_page.dart';
import 'info_row.dart';
import 'progress_timeline.dart';

class ActiveIncidentTracker extends StatefulWidget {
  const ActiveIncidentTracker({super.key});

  @override
  State<ActiveIncidentTracker> createState() => _ActiveIncidentTrackerState();
}

class _ActiveIncidentTrackerState extends State<ActiveIncidentTracker> {
  IncidentModel? _incidenteActivo;
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarIncidenteActivo();
    // ❌ Eliminado _startPolling()
  }

  // ❌ Eliminado el método _startPolling()

  Future<void> _cargarIncidenteActivo() async {
    setState(() {
      _cargando = true;
    });

    try {
      final data = await IncidenteApiService.instance.getIncidenteActivo();
      if (data != null) {
        setState(() {
          _incidenteActivo = IncidentModel.fromJson(data);
          _cargando = false;
        });
      } else {
        setState(() {
          _incidenteActivo = null;
          _cargando = false;
        });
      }
    } catch (e) {
      print("❌ Error cargando incidente activo: $e");
      setState(() {
        _incidenteActivo = null;
        _cargando = false;
      });
    }
  }

  // Agregar método para refrescar manualmente (pull-to-refresh)
  Future<void> _refresh() async {
    await _cargarIncidenteActivo();
  }

  double _getProgress() {
    if (_incidenteActivo == null) return 0;
    switch (_incidenteActivo!.estado) {
      case 'pendiente':
        return 0.2;
      case 'en_proceso':
        return 0.6;
      default:
        return 0;
    }
  }

  String _getEstadoTexto() {
    if (_incidenteActivo == null) return 'Sin incidentes activos';
    switch (_incidenteActivo!.estado) {
      case 'pendiente':
        return 'Buscando taller disponible';
      case 'en_proceso':
        return 'Técnico en camino';
      default:
        return _incidenteActivo!.estadoTexto;
    }
  }

  List<String> _getStages() {
    return ['Asignado', 'En camino', 'Atendiendo'];
  }

  String _getTiempoEstimado() {
    if (_incidenteActivo?.estado == 'en_proceso') {
      return '8-12 min';
    }
    return _incidenteActivo?.estado == 'pendiente'
        ? 'Buscando...'
        : 'En proceso';
  }

  String _getServicioTexto() {
    if (_incidenteActivo == null) return 'No hay servicio activo';
    return _incidenteActivo!.clasificacionIa?.toUpperCase() ?? 'ASISTENCIA';
  }

  String _getUbicacionTexto() {
    if (_incidenteActivo == null) return 'Ubicación no disponible';
    return _incidenteActivo!.direccionTexto ??
        'Lat: ${_incidenteActivo!.latitud.toStringAsFixed(6)}, Lng: ${_incidenteActivo!.longitud.toStringAsFixed(6)}';
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return _buildShimmerLoader();
    }

    if (_incidenteActivo == null) {
      return _buildEmptyState(context);
    }

    return RefreshIndicator(
      // ✅ Agregado para refrescar manualmente
      onRefresh: _refresh,
      child: Container(
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
            _buildHeader(),
            const SizedBox(height: 16),
            if (_incidenteActivo!.hasTaller) ...[
              _buildInfoTile(
                icon: Icons.business,
                label: 'Taller',
                value: _incidenteActivo!.tallerNombre,
              ),
              const SizedBox(height: 8),
            ],
            if (_incidenteActivo!.hasTecnico) ...[
              _buildInfoTile(
                icon: Icons.engineering,
                label: 'Técnico',
                value: _incidenteActivo!.tecnicoNombre,
              ),
              const SizedBox(height: 8),
            ],
            InfoRow(
              icon: Icons.category,
              label: 'Servicio',
              value: _getServicioTexto(),
            ),
            const SizedBox(height: 12),
            InfoRow(
              icon: Icons.access_time,
              label: 'Tiempo estimado',
              value: _getTiempoEstimado(),
            ),
            const SizedBox(height: 12),
            InfoRow(
              icon: Icons.location_on,
              label: 'Ubicación',
              value: _getUbicacionTexto(),
            ),
            const SizedBox(height: 16),
            ProgressTimeline(progress: _getProgress(), stages: _getStages()),
            const SizedBox(height: 16),
            _buildActionButton(context),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmerLoader() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: double.infinity,
                        height: 14,
                        color: Colors.white,
                      ),
                      const SizedBox(height: 8),
                      Container(width: 120, height: 12, color: Colors.white),
                    ],
                  ),
                ),
                Container(
                  width: 60,
                  height: 24,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...List.generate(
              3,
              (index) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(width: 18, height: 18, color: Colors.white),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(width: 60, height: 10, color: Colors.white),
                          const SizedBox(height: 4),
                          Container(
                            width: 120,
                            height: 12,
                            color: Colors.white,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Container(
              height: 8,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 18),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(color: Colors.white70, fontSize: 10),
              ),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    final estado = _incidenteActivo!.estado;
    final badgeColor = estado == 'pendiente' ? Colors.orange : Colors.green;
    final badgeText = estado == 'pendiente' ? 'PENDIENTE' : 'EN CURSO';

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.emergency, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Incidente Activo',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                _getEstadoTexto(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: badgeColor,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            badgeText,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: () {
          if (_incidenteActivo != null) {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    IncidentDetailPage(incidenteId: _incidenteActivo!.id),
              ),
            ).then((_) => _cargarIncidenteActivo());
          }
        },
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Text('Ver seguimiento completo'),
      ),
    );
  }

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
          const Icon(Icons.check_circle_outline, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          const Text(
            'No hay incidentes activos',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Todos los incidentes están resueltos',
            style: TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              // TODO: Navegar a reportar incidente
            },
            icon: const Icon(Icons.add_alert),
            label: const Text('Reportar nuevo incidente'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF8F06),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
