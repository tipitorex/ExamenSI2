import 'package:flutter/material.dart';
import '../services/incidente_api_service.dart';
import '../models/incident_model.dart';

class IncidentDetailPage extends StatefulWidget {
  final int incidenteId;

  const IncidentDetailPage({super.key, required this.incidenteId});

  @override
  State<IncidentDetailPage> createState() => _IncidentDetailPageState();
}

class _IncidentDetailPageState extends State<IncidentDetailPage> {
  IncidentModel? _incidente;
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarDetalle();
  }

  Future<void> _cargarDetalle() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final data = await IncidenteApiService.instance.getIncidenteDetalle(
        widget.incidenteId,
      );
      final incidente = IncidentModel.fromJson(data);
      setState(() {
        _incidente = incidente;
        _cargando = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'No registrado';
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  Color _getEstadoColor(String estado) {
    switch (estado) {
      case 'pendiente':
        return Colors.orange;
      case 'en_proceso':
        return Colors.blue;
      case 'atendido':
        return Colors.green;
      case 'cancelado':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Incidente #${widget.incidenteId}'),
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _cargarDetalle,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF005EA4),
              ),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    if (_incidente == null) {
      return const Center(child: Text('Incidente no encontrado'));
    }

    final estadoColor = _getEstadoColor(_incidente!.estado);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Estado
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: estadoColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: estadoColor),
            ),
            child: Column(
              children: [
                Icon(
                  _incidente!.isAtendido
                      ? Icons.check_circle
                      : _incidente!.isEnProceso
                      ? Icons.pending
                      : Icons.warning,
                  size: 48,
                  color: estadoColor,
                ),
                const SizedBox(height: 8),
                Text(
                  _incidente!.estadoTexto,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: estadoColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Información básica
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Información del Incidente',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow(
                    'Clasificación IA',
                    _incidente!.clasificacionIa ?? 'No disponible',
                  ),
                  _buildInfoRow('Prioridad', _incidente!.prioridadTexto),
                  _buildInfoRow(
                    'Fecha de creación',
                    _formatDate(_incidente!.creadoEn),
                  ),
                  if (_incidente!.fechaAtencion != null)
                    _buildInfoRow(
                      'Fecha de atención',
                      _formatDate(_incidente!.fechaAtencion),
                    ),
                  if (_incidente!.fechaFinalizacion != null)
                    _buildInfoRow(
                      'Fecha de finalización',
                      _formatDate(_incidente!.fechaFinalizacion),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Descripción
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Descripción',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _incidente!.descripcion,
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Ubicación
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ubicación',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _incidente!.direccionTexto ??
                              'Lat: ${_incidente!.latitud}, Lng: ${_incidente!.longitud}',
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
