import 'package:flutter/material.dart';
import '../../../services/in_app_notification_service.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  static const routeName = '/notificaciones';

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final InAppNotificationService _service = InAppNotificationService();
  List<InAppNotification> _notificaciones = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarNotificaciones();
  }

  Future<void> _cargarNotificaciones() async {
    setState(() => _cargando = true);
    final notificaciones = await _service.obtenerNotificaciones();
    setState(() {
      _notificaciones = notificaciones;
      _cargando = false;
    });
  }

  Future<void> _marcarComoLeida(InAppNotification notif) async {
    await _service.marcarComoLeida(notif.id);
    await _cargarNotificaciones();
  }

  String _formatearFecha(DateTime fecha) {
    final ahora = DateTime.now();
    final diff = ahora.difference(fecha);

    if (diff.inMinutes < 1) return 'Ahora';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} h';
    if (diff.inDays < 7) return 'Hace ${diff.inDays} días';
    return '${fecha.day}/${fecha.month}/${fecha.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _cargarNotificaciones,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _notificaciones.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text(
                    'No tienes notificaciones',
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _notificaciones.length,
              itemBuilder: (context, index) {
                final notif = _notificaciones[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  color: notif.leido ? Colors.white : const Color(0xFFF0F7FF),
                  child: InkWell(
                    onTap: () => _marcarComoLeida(notif),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  notif.titulo,
                                  style: TextStyle(
                                    fontWeight: notif.leido
                                        ? FontWeight.normal
                                        : FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              Text(
                                _formatearFecha(notif.fechaEnvio),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            notif.mensaje,
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 13,
                            ),
                          ),
                          if (!notif.leido)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF005EA4),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
