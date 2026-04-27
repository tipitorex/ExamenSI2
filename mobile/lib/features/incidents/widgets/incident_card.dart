import 'package:flutter/material.dart';
import '../models/incident_model.dart';

class IncidentCard extends StatelessWidget {
  final IncidentModel incident;
  final VoidCallback onTap;

  const IncidentCard({super.key, required this.incident, required this.onTap});

  String _formatDate(DateTime date) {
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

  Color _getPrioridadColor(String prioridad) {
    switch (prioridad) {
      case 'alta':
        return Colors.red;
      case 'media':
        return Colors.orange;
      case 'baja':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final estadoColor = _getEstadoColor(incident.estado);
    final prioridadColor = _getPrioridadColor(incident.prioridad);

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
                    'Incidente #${incident.id}',
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
                      color: estadoColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: estadoColor.withOpacity(0.5)),
                    ),
                    child: Text(
                      incident.estadoTexto,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: estadoColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Clasificación y prioridad
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey[200],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      incident.clasificacionIa?.toUpperCase() ?? 'GENERAL',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: prioridadColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: prioridadColor.withOpacity(0.5),
                      ),
                    ),
                    child: Text(
                      incident.prioridadTexto,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: prioridadColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Descripción
              Text(
                incident.descripcion.length > 100
                    ? '${incident.descripcion.substring(0, 100)}...'
                    : incident.descripcion,
                style: const TextStyle(fontSize: 13, color: Colors.grey),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              // Fecha
              Row(
                children: [
                  const Icon(
                    Icons.calendar_today,
                    size: 14,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(incident.creadoEn),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Botón ver detalles
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
