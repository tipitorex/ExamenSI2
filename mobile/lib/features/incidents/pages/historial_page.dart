import 'package:flutter/material.dart';
import '../services/incidente_api_service.dart';
import '../models/incident_model.dart';
import '../widgets/incident_card.dart';
import 'incident_detail_page.dart';

class HistorialPage extends StatefulWidget {
  const HistorialPage({super.key});

  @override
  State<HistorialPage> createState() => _HistorialPageState();
}

class _HistorialPageState extends State<HistorialPage> {
  List<IncidentModel> _incidentes = [];
  List<IncidentModel> _incidentesFiltrados = [];
  bool _cargando = true;
  String? _error;
  String _filtroEstado = 'todos';

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

  Future<void> _cargarIncidentes() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final data = await IncidenteApiService.instance.getMisIncidentes();
      print("📡 HistorialPage - Datos recibidos: $data");
      print("📡 HistorialPage - Tipo de datos: ${data.runtimeType}");

      if (data.isEmpty) {
        print("📡 HistorialPage - No hay incidentes");
        setState(() {
          _incidentes = [];
          _aplicarFiltro();
          _cargando = false;
        });
        return;
      }

      final incidentes = data.map((json) {
        print("📡 Procesando incidente: $json");
        return IncidentModel.fromJson(json);
      }).toList();

      setState(() {
        _incidentes = incidentes;
        _aplicarFiltro();
        _cargando = false;
      });
    } catch (e) {
      print("❌ HistorialPage - Error: $e");
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _aplicarFiltro() {
    if (_filtroEstado == 'todos') {
      _incidentesFiltrados = List.from(_incidentes);
    } else {
      _incidentesFiltrados = _incidentes
          .where((inc) => inc.estado == _filtroEstado)
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

    if (_incidentesFiltrados.isEmpty) {
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

    return RefreshIndicator(
      onRefresh: _cargarIncidentes,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _incidentesFiltrados.length,
        itemBuilder: (context, index) {
          final incident = _incidentesFiltrados[index];
          return IncidentCard(
            incident: incident,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => IncidentDetailPage(incidenteId: incident.id),
                ),
              ).then((_) => _cargarIncidentes());
            },
          );
        },
      ),
    );
  }
}
