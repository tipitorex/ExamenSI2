// mobile/lib/features/dashboard/widgets/incident_status_card.dart
import 'package:flutter/material.dart';

class IncidentStatusCard extends StatelessWidget {
  final int incidentId;
  final String title;
  final String description;
  final String status;
  final String date;
  final String? estimatedTime;
  final VoidCallback onTap;

  const IncidentStatusCard({
    super.key,
    required this.incidentId,
    required this.title,
    required this.description,
    required this.status,
    required this.date,
    this.estimatedTime,
    required this.onTap,
  });

  Color _getStatusColor() {
    switch (status.toLowerCase()) {
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

  String _getStatusText() {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En Proceso';
      case 'atendido':
        return 'Atendido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: ID y estado
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Incidente #$incidentId',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor().withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _getStatusColor().withOpacity(0.5),
                      ),
                    ),
                    child: Text(
                      _getStatusText(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: _getStatusColor(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Título
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              // Descripción
              Text(
                description,
                style: const TextStyle(fontSize: 12, color: Colors.grey),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              // Fecha y tiempo estimado
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today,
                    size: 14,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    date,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  if (estimatedTime != null) ...[
                    const SizedBox(width: 16),
                    const Icon(Icons.access_time, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      'Estimado: $estimatedTime',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),
              // Botón de ver detalle
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const Text(
                    'Ver detalles',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF005EA4),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.chevron_right,
                    size: 16,
                    color: Color(0xFF005EA4),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
