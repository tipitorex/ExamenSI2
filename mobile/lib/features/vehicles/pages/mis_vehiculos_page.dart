import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/services/auth_api_service.dart';
import '../services/vehiculo_api_service.dart';
import '../models/vehiculo_model.dart';
import 'vehicle_register_page.dart';

class MisVehiculosPage extends StatefulWidget {
  const MisVehiculosPage({super.key});

  static const routeName = '/mis-vehiculos';

  @override
  State<MisVehiculosPage> createState() => _MisVehiculosPageState();
}

class _MisVehiculosPageState extends State<MisVehiculosPage> {
  List<VehiculoModel> _vehiculos = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _cargarVehiculos();
  }

  Future<void> _cargarVehiculos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final vehiculos = await VehiculoApiService.instance.listarVehiculos();
      setState(() {
        _vehiculos = vehiculos;
        _isLoading = false;
      });
    } on AuthApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Error al cargar vehículos: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _eliminarVehiculo(VehiculoModel vehiculo) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar vehículo'),
        content: Text('¿Deseas eliminar ${vehiculo.nombreCorto}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await VehiculoApiService.instance.eliminarVehiculo(vehiculo.id);

      if (!mounted) return;

      setState(() {
        _vehiculos.removeWhere((v) => v.id == vehiculo.id);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${vehiculo.nombreCorto} eliminado correctamente'),
          backgroundColor: Colors.green,
        ),
      );
    } on AuthApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: Colors.red),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _agregarVehiculo() async {
    final result = await Navigator.push<VehiculoModel>(
      context,
      MaterialPageRoute(builder: (_) => const VehicleRegisterPage()),
    );

    if (result != null) {
      _cargarVehiculos();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Vehículos'),
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _agregarVehiculo,
            icon: const Icon(Icons.add),
            tooltip: 'Agregar vehículo',
          ),
        ],
      ),
      body: RefreshIndicator(onRefresh: _cargarVehiculos, child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_errorMessage!),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _cargarVehiculos,
              child: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    if (_vehiculos.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.directions_car, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No tienes vehículos registrados',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Text(
              'Agrega tu primer vehículo para reportar emergencias',
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _agregarVehiculo,
              icon: const Icon(Icons.add),
              label: const Text('Agregar vehículo'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF005EA4),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _vehiculos.length,
      itemBuilder: (context, index) {
        final vehiculo = _vehiculos[index];
        return _VehiculoCard(
          vehiculo: vehiculo,
          onDelete: () => _eliminarVehiculo(vehiculo),
        );
      },
    );
  }
}

// ============================================================
// WIDGET TARJETA DE VEHÍCULO (CORREGIDO - SIN OVERFLOW)
// ============================================================
class _VehiculoCard extends StatelessWidget {
  const _VehiculoCard({required this.vehiculo, required this.onDelete});

  final VehiculoModel vehiculo;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icono del vehículo - Más pequeño para ahorrar espacio
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: const Color(0xFF005EA4).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.directions_car,
                size: 28,
                color: Color(0xFF005EA4),
              ),
            ),
            const SizedBox(width: 12),
            // Información del vehículo - Expanded evita overflow
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Modelo y marca - con ellipsis si es muy largo
                  Text(
                    '${vehiculo.marca} ${vehiculo.modelo}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  // Usar Wrap para que los chips bajen a nueva línea si es necesario
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      // Placa (chip)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF005EA4).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          vehiculo.placa,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF005EA4),
                          ),
                        ),
                      ),
                      // Año (si existe)
                      if (vehiculo.anio != null)
                        Text(
                          'Año: ${vehiculo.anio}',
                          style: const TextStyle(fontSize: 12),
                        ),
                      // Color (si existe)
                      if (vehiculo.color != null)
                        Text(
                          'Color: ${vehiculo.color}',
                          style: const TextStyle(fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ],
              ),
            ),
            // Botón eliminar - más compacto
            IconButton(
              onPressed: onDelete,
              icon: const Icon(
                Icons.delete_outline,
                color: Colors.red,
                size: 22,
              ),
              tooltip: 'Eliminar vehículo',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      ),
    );
  }
}
