import 'dart:async';

import 'package:flutter/material.dart';
import '../services/incidente_api_service.dart';
import '../services/local_incident_db.dart';
import '../models/incident_model.dart';
import '../models/pending_incident.dart';
import '../widgets/incident_card.dart';
import 'incident_detail_page.dart';
import '../../../services/sync_service_provider.dart';

class HistorialPage extends StatefulWidget {
  const HistorialPage({super.key});

  @override
  State<HistorialPage> createState() => _HistorialPageState();
}

// ============================================================
// MODELO UNIFICADO PARA LA LISTA
// ============================================================
class _HistorialItem {
  final String displayId;
  final int? incidentId;
  final String? syncId;
  final String estado;
  final bool isPending;
  final IncidentModel? onlineData;
  final PendingIncident? offlineData;
  final String clasificacionIa;
  final DateTime fechaCreacion;

  _HistorialItem({
    required this.displayId,
    this.incidentId,
    this.syncId,
    required this.estado,
    required this.isPending,
    this.onlineData,
    this.offlineData,
    required this.clasificacionIa,
    required this.fechaCreacion,
  });
}

// ============================================================
// STATE
// ============================================================
class _HistorialPageState extends State<HistorialPage> {
  List<_HistorialItem> _todosLosItems = [];
  List<_HistorialItem> _itemsFiltrados = [];
  bool _cargando = true;
  String? _error;
  String _filtroEstado = 'todos';

  // TODO: Obtener el SyncService desde un InheritedWidget/Provider
  // late final SyncService _syncService;

  final List<Map<String, dynamic>> _estadosFiltro = [
    {'valor': 'todos', 'label': 'Todos'},
    {'valor': 'pendiente', 'label': 'Pendiente'},
    {'valor': 'en_proceso', 'label': 'En Proceso'},
    {'valor': 'atendido', 'label': 'Atendido'},
  ];

  @override
  void initState() {
    super.initState();
    _cargarIncidentes();
  }

  StreamSubscription<void>? _syncSub;

  Future<void> _cargarIncidentes() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    final localDB = LocalIncidentDB();
    final pendientes = await localDB.getPendientes();
    final List<_HistorialItem> offlineItems = [];

    for (final p in pendientes) {
      offlineItems.add(_HistorialItem(
        displayId: 'Pendiente de sincronización',
        syncId: p.syncId,
        estado: 'pendiente',
        isPending: true,
        offlineData: p,
        clasificacionIa: 'incierto',
        fechaCreacion: p.createdAt,
      ));
    }

    List<_HistorialItem> onlineItems = [];
    try {
      // 1. Cargar incidentes online
      final data = await IncidenteApiService.instance.getMisIncidentes();
      if (data.isNotEmpty) {
        for (final json in data) {
          final incidente = IncidentModel.fromJson(json);
          onlineItems.add(_HistorialItem(
            displayId: '#${incidente.id}',
            incidentId: incidente.id,
            estado: incidente.estado,
            isPending: false,
            onlineData: incidente,
            clasificacionIa: incidente.clasificacionIa ?? 'incierto',
            fechaCreacion: incidente.creadoEn,
          ));
        }
      }
    } catch (e) {
      _error =
          'Sin conexión para cargar historial en línea. Se muestran incidentes pendientes localmente.';
    }

    final todos = [...onlineItems, ...offlineItems];
    todos.sort((a, b) => b.fechaCreacion.compareTo(a.fechaCreacion));

    setState(() {
      _todosLosItems = todos;
      _aplicarFiltro();
      _cargando = false;
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Suscribir al SyncService para refrescar automáticamente cuando termine
    // una sincronización.
    _syncSub?.cancel();
    final syncService = SyncServiceProvider.of(context);
    if (syncService != null) {
      _syncSub = syncService.onSyncComplete.listen((_) {
        _cargarIncidentes();
      });
    }
  }

  void _aplicarFiltro() {
    if (_filtroEstado == 'todos') {
      _itemsFiltrados = List.from(_todosLosItems);
    } else {
      _itemsFiltrados = _todosLosItems
          .where((item) => item.estado == _filtroEstado)
          .toList();
    }
    setState(() {});
  }

  void _cambiarFiltro(String? valor) {
    if (valor != null) {
      _filtroEstado = valor;
      _aplicarFiltro();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Historial'),
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarIncidentes,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _estadosFiltro.map((filtro) {
                  final isSelected = _filtroEstado == filtro['valor'];
                  return Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: FilterChip(
                      label: Text(filtro['label']),
                      selected: isSelected,
                      onSelected: (_) => _cambiarFiltro(filtro['valor']),
                      backgroundColor: Colors.grey[200],
                      selectedColor: const Color(0xFF005EA4),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : Colors.black87,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.normal,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          // Contenido
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_itemsFiltrados.isEmpty) {
      if (_todosLosItems.isEmpty && _error != null) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(_error!),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _cargarIncidentes,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF005EA4),
                ),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        );
      }

      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.history, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No hay incidentes',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            Text(
              _filtroEstado == 'todos'
                  ? 'No has reportado ningún incidente aún'
                  : 'No hay incidentes con este estado',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        if (_error != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.yellow.shade100,
            child: Row(
              children: [
                const Icon(Icons.wifi_off, color: Colors.orange),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.black87),
                  ),
                ),
              ],
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _cargarIncidentes,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _itemsFiltrados.length,
              itemBuilder: (context, index) {
                final item = _itemsFiltrados[index];

                return IncidentCard(
                  incident: item.onlineData,
                  pending: item.offlineData,
                  onTap: item.isPending
                      ? null
                      : () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => IncidentDetailPage(
                                incidenteId: item.incidentId!,
                              ),
                            ),
                          ).then((_) => _cargarIncidentes());
                        },
                  onRetry: item.isPending
                      ? () async {
                          final syncService = SyncServiceProvider.of(context);
                          if (syncService != null) {
                            await syncService.sincronizarPendientes();
                            _cargarIncidentes();
                          }
                        }
                      : null,
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _syncSub?.cancel();
    super.dispose();
  }
}