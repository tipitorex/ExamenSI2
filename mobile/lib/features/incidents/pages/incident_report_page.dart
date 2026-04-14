import 'package:flutter/material.dart';

import '../../auth/services/auth_api_service.dart';
import '../../vehicles/models/vehiculo_model.dart';
import '../../vehicles/services/vehiculo_api_service.dart';
import '../services/incidente_api_service.dart';

class IncidentReportPage extends StatefulWidget {
  const IncidentReportPage({super.key});

  static const routeName = '/incident-report';

  @override
  State<IncidentReportPage> createState() => _IncidentReportPageState();
}

class _IncidentReportPageState extends State<IncidentReportPage> {
  final _formKey = GlobalKey<FormState>();
  final _detailsCtrl = TextEditingController();
  final _latCtrl = TextEditingController(text: '34.0522');
  final _lngCtrl = TextEditingController(text: '-118.2437');

  bool _isLoadingVehiculos = true;
  bool _isSubmitting = false;
  String? _errorMessage;
  String _prioridad = 'media';
  int? _vehiculoSeleccionadoId;
  List<VehiculoModel> _vehiculos = const [];

  @override
  void initState() {
    super.initState();
    _cargarVehiculos();
  }

  Future<void> _cargarVehiculos() async {
    setState(() {
      _isLoadingVehiculos = true;
      _errorMessage = null;
    });

    try {
      final vehiculos = await VehiculoApiService.instance.listarVehiculos();

      if (!mounted) {
        return;
      }

      setState(() {
        _vehiculos = vehiculos;
        _vehiculoSeleccionadoId = vehiculos.isEmpty ? null : vehiculos.first.id;
      });
    } on AuthApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'No se pudieron cargar los vehiculos.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingVehiculos = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _detailsCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _analizarIncidente,
            icon: Icon(
              _isSubmitting ? Icons.hourglass_top : Icons.auto_awesome,
            ),
            label: Text(_isSubmitting ? 'Enviando...' : 'Analizar con IA'),
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back),
                    ),
                    const Expanded(
                      child: Text(
                        'Documentar Incidente',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF005EA4),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.notifications_none),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const _StepIndicator(),
                const SizedBox(height: 20),
                const Text(
                  'Vehiculo para el reporte',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF404752),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 10),
                if (_isLoadingVehiculos)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (_vehiculos.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E7),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFFD4A8)),
                    ),
                    child: const Text(
                      'No tienes vehiculos registrados. Registra uno antes de reportar un incidente.',
                      style: TextStyle(
                        color: Color(0xFF623300),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                else
                  DropdownButtonFormField<int>(
                    initialValue: _vehiculoSeleccionadoId,
                    decoration: const InputDecoration(
                      labelText: 'Selecciona tu vehiculo',
                      prefixIcon: Icon(Icons.directions_car_outlined),
                    ),
                    items: _vehiculos
                        .map(
                          (vehiculo) => DropdownMenuItem<int>(
                            value: vehiculo.id,
                            child: Text(vehiculo.nombreCorto),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        _vehiculoSeleccionadoId = value;
                      });
                    },
                  ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _prioridad,
                  decoration: const InputDecoration(
                    labelText: 'Prioridad',
                    prefixIcon: Icon(Icons.priority_high_outlined),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'baja', child: Text('Baja')),
                    DropdownMenuItem(value: 'media', child: Text('Media')),
                    DropdownMenuItem(value: 'alta', child: Text('Alta')),
                  ],
                  onChanged: (value) {
                    if (value == null) {
                      return;
                    }
                    setState(() {
                      _prioridad = value;
                    });
                  },
                ),
                const SizedBox(height: 20),
                const Text(
                  'Evidencia visual',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF404752),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  height: 250,
                  child: Row(
                    children: const [
                      Expanded(
                        flex: 3,
                        child: _PhotoSlot(
                          label: 'Vista frontal',
                          requiredPhoto: true,
                          icon: Icons.directions_car,
                        ),
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: Column(
                          children: [
                            Expanded(
                              child: _PhotoSlot(
                                label: 'Lateral',
                                icon: Icons.view_sidebar_outlined,
                              ),
                            ),
                            SizedBox(height: 8),
                            Expanded(
                              child: _PhotoSlot(
                                label: 'Motor',
                                icon: Icons.precision_manufacturing_outlined,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x14001C38),
                        blurRadius: 16,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Describe el problema',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Habla claro o escribe una descripcion corta del incidente.',
                        style: TextStyle(color: Color(0xFF404752)),
                      ),
                      const SizedBox(height: 12),
                      const _WaveformMock(),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.mic),
                        label: const Text('Grabar audio'),
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: _detailsCtrl,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          labelText: 'Detalles del incidente',
                          hintText:
                              'Ej. choque lateral en semaforo, humo en el motor, etc.',
                        ),
                        validator: (value) {
                          if (value == null || value.trim().length < 5) {
                            return 'Describe el incidente con al menos 5 caracteres.';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Ubicacion detectada',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF404752),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0x26C0C7D4)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Image.network(
                        'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80',
                        height: 120,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                      const Padding(
                        padding: EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(
                              Icons.gps_fixed,
                              size: 18,
                              color: Color(0xFF005EA4),
                            ),
                            SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '1244 Grand Ave, Los Angeles, CA',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _latCtrl,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                          signed: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Latitud',
                          prefixIcon: Icon(Icons.gps_fixed),
                        ),
                        validator: (value) {
                          final parsed = double.tryParse((value ?? '').trim());
                          if (parsed == null || parsed < -90 || parsed > 90) {
                            return 'Latitud invalida';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _lngCtrl,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                          signed: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Longitud',
                          prefixIcon: Icon(Icons.explore_outlined),
                        ),
                        validator: (value) {
                          final parsed = double.tryParse((value ?? '').trim());
                          if (parsed == null || parsed < -180 || parsed > 180) {
                            return 'Longitud invalida';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _analizarIncidente() async {
    final formValido = _formKey.currentState?.validate() ?? false;
    if (!formValido) {
      return;
    }

    if (_vehiculoSeleccionadoId == null) {
      setState(() {
        _errorMessage = 'Selecciona un vehiculo para reportar el incidente.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final incidenteId = await IncidenteApiService.instance.reportarIncidente(
        vehiculoId: _vehiculoSeleccionadoId!,
        latitud: double.parse(_latCtrl.text.trim()),
        longitud: double.parse(_lngCtrl.text.trim()),
        descripcion: _detailsCtrl.text.trim(),
        prioridad: _prioridad,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Incidente #$incidenteId reportado correctamente.'),
        ),
      );
      Navigator.pop(context);
    } on AuthApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'No se pudo reportar el incidente.';
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

class _StepIndicator extends StatelessWidget {
  const _StepIndicator();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            children: [
              Row(
                children: const [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: Color(0xFF005EA4),
                    child: Text(
                      '1',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  SizedBox(width: 8),
                  Text(
                    'Evidencia',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                height: 6,
                decoration: BoxDecoration(
                  color: const Color(0xFF005EA4),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Opacity(
            opacity: .45,
            child: Column(
              children: [
                Row(
                  children: const [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: Color(0xFFE2E2E2),
                      child: Text(
                        '2',
                        style: TextStyle(
                          color: Color(0xFF404752),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    SizedBox(width: 8),
                    Text(
                      'Analisis IA',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E2E2),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PhotoSlot extends StatelessWidget {
  const _PhotoSlot({
    required this.label,
    required this.icon,
    this.requiredPhoto = false,
  });

  final String label;
  final IconData icon;
  final bool requiredPhoto;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        decoration: BoxDecoration(
          color: const Color(0xFFF4F3F3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFC0C7D4), width: 1.4),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 28, color: const Color(0xFF005EA4)),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
              if (requiredPhoto)
                const Text(
                  'OBLIGATORIO',
                  style: TextStyle(
                    fontSize: 10,
                    color: Color(0xFF404752),
                    fontWeight: FontWeight.w700,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WaveformMock extends StatelessWidget {
  const _WaveformMock();

  @override
  Widget build(BuildContext context) {
    const heights = <double>[16, 28, 42, 20, 34, 18, 44, 24, 16, 32, 20, 40];

    return SizedBox(
      height: 50,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: heights
            .map(
              (height) => Container(
                width: 4,
                height: height,
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF8F06),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}
