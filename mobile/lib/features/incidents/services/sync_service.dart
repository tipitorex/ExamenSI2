import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../models/pending_incident.dart';
import 'local_incident_db.dart';
import 'incidente_api_service.dart';

class SyncService {
  final IncidenteApiService apiService;
  final LocalIncidentDB localDB;
  StreamSubscription? _connectivitySub;
  // Notifica cuando se completa una sincronización (útil para refrescar UI)
  final StreamController<void> _onSyncController = StreamController.broadcast();

  Stream<void> get onSyncComplete => _onSyncController.stream;

  SyncService({required this.apiService, required this.localDB}) {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection) {
        sincronizarPendientes();
      }
    });
  }

  Future<void> sincronizarPendientes() async {
    final pendientes = await localDB.getPendientes();
    for (final incident in pendientes) {
      try {
        // Usamos el nuevo método del API service
        await apiService.sincronizarIncidentePendiente(
          syncId: incident.syncId,
          vehiculoId: incident.vehiculoId,
          latitud: incident.latitud,
          longitud: incident.longitud,
          descripcion: incident.descripcion,
          prioridad: incident.prioridad,
          imagenFrontalPath: incident.imagenFrontalPath,
          imagenesAdicionalesPaths: incident.imagenesAdicionalesPaths,
          audioPath: incident.audioPath,
        );
        await localDB.updateStatus(incident.localId, 'enviado');
        // Opcional: eliminar el registro después de enviarlo
        // await localDB.delete(incident.localId);
      } catch (e) {
        await localDB.updateStatus(incident.localId, 'pendiente',
            errorMessage: e.toString());
      }
    }
    // Notificar que un ciclo de sincronización terminó
    try {
      _onSyncController.add(null);
    } catch (_) {}
  }

  void dispose() {
    _connectivitySub?.cancel();
    _onSyncController.close();
  }
}