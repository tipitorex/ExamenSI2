import 'package:flutter/material.dart';
import '../models/incident_model.dart';
import '../models/pending_incident.dart';

class IncidentCard extends StatelessWidget {
  final IncidentModel? incident;         // online
  final PendingIncident? pending;       // offline
  final VoidCallback? onTap;            // null si es offline (no navega)
  final VoidCallback? onRetry;          // (opcional) reintentar sincronización manual

  const IncidentCard({
    super.key,
    this.incident,
    this.pending,
    this.onTap,
    this.onRetry,
  }) : assert(incident != null || pending != null,
            'Debe proporcionar incident (online) o pending (offline)');

  bool get _isOffline => pending != null;

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year} '
        '${date.hour.toString().padLeft(2, '0')}:'
        '${date.minute.toString().padLeft(2, '0')}';
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
    if (_isOffline) {
      return _buildOfflineCard(context);
    }
    return _buildOnlineCard(context);
  }

  // ============================================================
  // TARJETA ONLINE (casi igual que antes, con pequeños ajustes)
  // ============================================================
  Widget _buildOnlineCard(BuildContext context) {
    final inc = incident!;
    final estadoColor = _getEstadoColor(inc.estado);
    final prioridadColor = _getPrioridadColor(inc.prioridad);

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
                    'Incidente #${inc.id}',
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
                      inc.estadoTexto,
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
                      inc.clasificacionIa?.toUpperCase() ?? 'GENERAL',
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
                      inc.prioridadTexto,
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
                inc.descripcion.length > 100
                    ? '${inc.descripcion.substring(0, 100)}...'
                    : inc.descripcion,
                style: const TextStyle(fontSize: 13, color: Colors.grey),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              // Fecha
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(inc.creadoEn),
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

  // ============================================================
  // TARJETA OFFLINE
  // ============================================================
  Widget _buildOfflineCard(BuildContext context) {
    final p = pending!;
    final prioridadColor = _getPrioridadColor(p.prioridad);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.orange.shade300, width: 1.5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Badge de pendiente
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.shade100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.sync_disabled, size: 14, color: Colors.orange.shade800),
                    const SizedBox(width: 4),
                    Text(
                      'Pendiente de sincronización',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.orange.shade800,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              // Prioridad
              Row(
                children: [
                  Icon(Icons.warning_amber, size: 14, color: prioridadColor),
                  const SizedBox(width: 4),
                  Text(
                    'Prioridad ${p.prioridad.toUpperCase()}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: prioridadColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // Descripción
              Text(
                (p.descripcion != null && p.descripcion!.isNotEmpty)
                    ? (p.descripcion!.length > 100
                        ? '${p.descripcion!.substring(0, 100)}...'
                        : p.descripcion!)
                    : 'Sin descripción de texto',
                style: const TextStyle(fontSize: 13, color: Colors.grey),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              // Fecha e indicador de archivos adjuntos
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    _formatDate(p.createdAt),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                  const Spacer(),
                  if (p.imagenFrontalPath != null)
                    const Icon(Icons.image, size: 14, color: Colors.grey),
                  if (p.imagenFrontalPath != null) const SizedBox(width: 4),
                  if (p.audioPath != null)
                    const Icon(Icons.mic, size: 14, color: Colors.grey),
                ],
              ),
              const SizedBox(height: 8),
              // Mensaje de error (si hubo un intento fallido)
              if (p.errorMessage != null)
                Text(
                  'Error: ${p.errorMessage}',
                  style: TextStyle(fontSize: 11, color: Colors.red.shade700),
                ),
              // Botón opcional de reintento manual
              if (onRetry != null) ...[
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh, size: 16),
                    label: const Text('Reintentar ahora'),
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF005EA4),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}