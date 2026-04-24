import 'package:flutter/material.dart';
import 'info_row.dart';
import 'progress_timeline.dart';

class ActiveIncidentTracker extends StatelessWidget {
  const ActiveIncidentTracker({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Conectar con servicio de incidentes para obtener datos reales
    // Por ahora son datos de ejemplo

    final hasActiveIncident = true; // Cambiar según estado real

    if (!hasActiveIncident) {
      return _buildEmptyState(context);
    }

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
          _buildHeader(),
          const SizedBox(height: 16),
          InfoRow(
            icon: Icons.category,
            label: 'Servicio',
            value: 'Auxilio mecánico',
          ),
          const SizedBox(height: 12),
          InfoRow(
            icon: Icons.access_time,
            label: 'Tiempo estimado',
            value: '8 min',
          ),
          const SizedBox(height: 12),
          InfoRow(
            icon: Icons.location_on,
            label: 'Ubicación',
            value: 'Av. Principal #123',
          ),
          const SizedBox(height: 16),
          ProgressTimeline(
            progress: 0.6,
            stages: const ['Asignado', 'En camino', 'Atendiendo'],
          ),
          const SizedBox(height: 16),
          _buildActionButton(context),
        ],
      ),
    );
  }

  Widget _buildHeader() {
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
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Incidente Activo',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'En proceso de atención',
                style: TextStyle(
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
            color: Colors.orange,
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Text(
            'EN CURSO',
            style: TextStyle(
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
          // TODO: Navegar al detalle del incidente activo
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Seguimiento del incidente - Próximamente'),
            ),
          );
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
