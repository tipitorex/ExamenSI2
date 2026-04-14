import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../auth/services/auth_api_service.dart';
import '../services/vehiculo_api_service.dart';

class VehicleRegisterPage extends StatefulWidget {
  const VehicleRegisterPage({super.key});

  static const routeName = '/vehicle-register';

  @override
  State<VehicleRegisterPage> createState() => _VehicleRegisterPageState();
}

class _VehicleRegisterPageState extends State<VehicleRegisterPage> {
  final _formKey = GlobalKey<FormState>();
  bool _isSubmitting = false;
  String? _errorMessage;
  final _placaCtrl = TextEditingController();
  final _marcaCtrl = TextEditingController();
  final _modeloCtrl = TextEditingController();
  final _anioCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();

  @override
  void dispose() {
    _placaCtrl.dispose();
    _marcaCtrl.dispose();
    _modeloCtrl.dispose();
    _anioCtrl.dispose();
    _colorCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registrar Vehiculo')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(22),
                    gradient: const LinearGradient(
                      colors: [Color(0xFF005EA4), Color(0xFF0077CE)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Agrega tu vehiculo',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 28,
                        ),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Esto permite reportes de emergencia mas rapidos y precisos.',
                        style: TextStyle(color: Color(0xFFE3EEFB)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                TextFormField(
                  controller: _placaCtrl,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(
                    labelText: 'Placa',
                    hintText: 'ABC-123',
                    prefixIcon: Icon(Icons.pin_outlined),
                  ),
                  validator: (value) => (value == null || value.trim().isEmpty)
                      ? 'Ingresa la placa'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _marcaCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Marca',
                    hintText: 'Toyota',
                    prefixIcon: Icon(Icons.branding_watermark_outlined),
                  ),
                  validator: (value) => (value == null || value.trim().isEmpty)
                      ? 'Ingresa la marca'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _modeloCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Modelo',
                    hintText: 'Hilux',
                    prefixIcon: Icon(Icons.directions_car_filled_outlined),
                  ),
                  validator: (value) => (value == null || value.trim().isEmpty)
                      ? 'Ingresa el modelo'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _anioCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Anio',
                    hintText: 'Opcional',
                    prefixIcon: Icon(Icons.calendar_month_outlined),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return null;
                    }
                    final year = int.tryParse(value.trim());
                    if (year == null || year < 1950 || year > 2100) {
                      return 'Ingresa un anio valido';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _colorCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Color',
                    hintText: 'Blanco',
                    prefixIcon: Icon(Icons.palette_outlined),
                  ),
                ),
                if (_errorMessage != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFEBEA),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFF1B8B5)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(
                        color: Color(0xFF93000A),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : _guardarVehiculo,
                  icon: Icon(
                    _isSubmitting ? Icons.hourglass_top : Icons.save_outlined,
                  ),
                  label: Text(
                    _isSubmitting ? 'Guardando...' : 'Guardar vehiculo',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _guardarVehiculo() async {
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final anio = _anioCtrl.text.trim().isEmpty
          ? null
          : int.parse(_anioCtrl.text.trim());
      final vehiculo = await VehiculoApiService.instance.crearVehiculo(
        placa: _placaCtrl.text,
        marca: _marcaCtrl.text,
        modelo: _modeloCtrl.text,
        anio: anio,
        color: _colorCtrl.text,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Vehiculo ${vehiculo.placa} registrado correctamente.'),
        ),
      );
      Navigator.pop(context, vehiculo);
    } on AuthApiException catch (error) {
      debugPrint('[VehicleRegister] AuthApiException: ${error.message}');
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = error.message;
      });
    } catch (e, stack) {
      debugPrint('[VehicleRegister] Error inesperado: $e\n$stack');
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'Error: $e';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}
