import 'package:flutter/material.dart';
import '../services/tecnico_api_service.dart';
import '../models/asignacion_tecnico_model.dart';
import 'detalle_asignacion_page.dart';

class AsignacionesPage extends StatefulWidget {
  final Function(int)? onCountChanged;

  const AsignacionesPage({super.key, this.onCountChanged});

  @override
  State<AsignacionesPage> createState() => _AsignacionesPageState();
}

class _AsignacionesPageState extends State<AsignacionesPage> {
  List<AsignacionTecnico> _asignaciones = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarAsignaciones();
  }

  Future<void> _cargarAsignaciones() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final asignaciones = await TecnicoApiService.instance
          .obtenerMisAsignaciones();
      setState(() {
        _asignaciones = asignaciones;
        _cargando = false;
      });

      final pendientes = asignaciones
          .where((a) => a.estado == 'pendiente')
          .length;
      widget.onCountChanged?.call(pendientes);
    } catch (e) {
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
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
            Text('Error: $_error'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _cargarAsignaciones,
              child: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    if (_asignaciones.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle_outline, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No tienes asignaciones pendientes',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Cuando el taller te asigne una emergencia,\naparecerá aquí.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _cargarAsignaciones,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _asignaciones.length,
        itemBuilder: (context, index) {
          final asignacion = _asignaciones[index];
          return _AsignacionCard(
            asignacion: asignacion,
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DetalleAsignacionPage(asignacion: asignacion),
                ),
              ).then((_) => _cargarAsignaciones());
            },
          );
        },
      ),
    );
  }
}

// ============================================================
// TARJETA DE ASIGNACIÓN
// ============================================================

class _AsignacionCard extends StatelessWidget {
  final AsignacionTecnico asignacion;
  final VoidCallback onTap;

  const _AsignacionCard({required this.asignacion, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: asignacion.prioridadColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      asignacion.prioridadTexto,
                      style: TextStyle(
                        color: asignacion.prioridadColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: asignacion.estadoColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      asignacion.estadoTexto,
                      style: TextStyle(
                        color: asignacion.estadoColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '#${asignacion.incidenteId}',
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(
                    Icons.person_outline,
                    size: 16,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      asignacion.clienteNombre,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.description_outlined,
                    size: 16,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      asignacion.descripcion,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(
                    Icons.category_outlined,
                    size: 16,
                    color: Colors.grey,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    asignacion.clasificacion,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF005EA4),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text('Ver detalles'),
                    ),
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
