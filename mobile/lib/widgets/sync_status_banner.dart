import 'package:flutter/material.dart';

import '../services/sync_service.dart';

class SyncStatusBanner extends StatelessWidget {
  const SyncStatusBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: SyncService.instance,
      builder: (context, _) {
        final sync = SyncService.instance;

        if (sync.sincronizando) {
          return _Banner(
            color: Colors.blue.shade700,
            icon: const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            ),
            mensaje: 'Sincronizando emergencia...',
          );
        }

        if (sync.ultimoError != null) {
          return _Banner(
            color: Colors.red.shade700,
            icon: const Icon(Icons.error_outline, color: Colors.white, size: 18),
            mensaje: sync.ultimoError!,
            accion: TextButton(
              onPressed: sync.reintentarErrores,
              child: const Text('REINTENTAR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          );
        }

        if (sync.pendientesCount > 0) {
          return _Banner(
            color: Colors.orange.shade700,
            icon: const Icon(Icons.cloud_off, color: Colors.white, size: 18),
            mensaje: sync.pendientesCount == 1
                ? '1 emergencia guardada — sin conexión'
                : '${sync.pendientesCount} emergencias guardadas — sin conexión',
          );
        }

        return const SizedBox.shrink();
      },
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.color,
    required this.icon,
    required this.mensaje,
    this.accion,
  });

  final Color color;
  final Widget icon;
  final String mensaje;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: color,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          icon,
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              mensaje,
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
          if (accion != null) accion!,
        ],
      ),
    );
  }
}
