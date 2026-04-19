import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';

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

  // Imagenes
  File? _imgFrontal;
  File? _imgLateral;
  File? _imgMotor;

  // Audio
  String? _audioPath;
  bool _isRecording = false;
  final AudioRecorder _audioRecorder = AudioRecorder();

  // Localización
  bool _isGettingLocation = false;

  @override
  void initState() {
    super.initState();
    _cargarVehiculos();
    _obtenerUbicacionActual();
  }

  @override
  void dispose() {
    _detailsCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _obtenerUbicacionActual() async {
    setState(() => _isGettingLocation = true);
    try {
      final status = await Permission.location.request();
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Se necesita permiso de ubicación para continuar'),
            ),
          );
        }
        setState(() => _isGettingLocation = false);
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _latCtrl.text = pos.latitude.toStringAsFixed(6);
      _lngCtrl.text = pos.longitude.toStringAsFixed(6);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al obtener ubicación: ${e.toString()}'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGettingLocation = false);
      }
    }
  }

  Future<void> _pickImage(String tipo) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (picked == null) return;

    setState(() {
      switch (tipo) {
        case 'frontal':
          _imgFrontal = File(picked.path);
          break;
        case 'lateral':
          _imgLateral = File(picked.path);
          break;
        case 'motor':
          _imgMotor = File(picked.path);
          break;
      }
    });
  }

  Future<void> _startOrStopRecording() async {
    if (_isRecording) {
      // Detener grabación
      final path = await _audioRecorder.stop();
      setState(() {
        _audioPath = path;
        _isRecording = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Audio grabado correctamente')),
        );
      }
    } else {
      // Iniciar grabación
      final status = await Permission.microphone.request();
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Se necesita permiso de micrófono para grabar audio',
              ),
            ),
          );
        }
        return;
      }

      // Verificar si ya se está grabando
      if (await _audioRecorder.isRecording()) {
        return;
      }

      // Generar una ruta única para el archivo de audio
      final directory = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final audioPath = '${directory.path}/audio_$timestamp.m4a';

      // Iniciar grabación con la ruta especificada
      await _audioRecorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: audioPath,
      );

      setState(() {
        _isRecording = true;
        _audioPath = null;
      });
    }
  }

  Future<void> _cargarVehiculos() async {
    setState(() {
      _isLoadingVehiculos = true;
      _errorMessage = null;
    });

    try {
      final vehiculos = await VehiculoApiService.instance.listarVehiculos();

      if (!mounted) return;

      setState(() {
        _vehiculos = vehiculos;
        _vehiculoSeleccionadoId = vehiculos.isEmpty ? null : vehiculos.first.id;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'No se pudieron cargar los vehículos.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingVehiculos = false;
        });
      }
    }
  }

  Future<void> _analizarIncidente() async {
    final formValido = _formKey.currentState?.validate() ?? false;
    if (!formValido) {
      return;
    }

    if (_vehiculoSeleccionadoId == null) {
      setState(() {
        _errorMessage = 'Selecciona un vehículo para reportar el incidente.';
      });
      return;
    }

    // Validar que se haya tomado la foto frontal (obligatoria)
    if (_imgFrontal == null) {
      setState(() {
        _errorMessage = 'La foto frontal del vehículo es obligatoria.';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final resultado = await IncidenteApiService.instance.reportarIncidente(
        vehiculoId: _vehiculoSeleccionadoId!,
        latitud: double.parse(_latCtrl.text.trim()),
        longitud: double.parse(_lngCtrl.text.trim()),
        descripcion: _detailsCtrl.text.trim(),
        prioridad: _prioridad,
        audioPath: _audioPath,
        imagenFrontal: _imgFrontal,
        imagenesAdicionales: [
          _imgLateral,
          _imgMotor,
        ].whereType<File>().toList(),
      );

      if (!mounted) return;

      // Mostrar diálogo con el análisis de IA
      _mostrarDialogoAnalisis(resultado);

      // Limpiar el formulario
      _limpiarFormulario();
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'No se pudo reportar el incidente: ${error.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _mostrarDialogoAnalisis(Map<String, dynamic> resultado) {
    final Map<String, String> clasificaciones = {
      'bateria': '🔋 Problema de batería',
      'llanta': '🛞 Pinchazo / Llanta',
      'choque': '💥 Choque / Accidente',
      'motor': '🔧 Falla de motor',
      'llave': '🔑 Problema con llaves',
      'incierto': '❓ No clasificado',
      'otros': '📝 Otro tipo',
    };

    final Map<String, Color> coloresPrioridad = {
      'baja': Colors.green,
      'media': Colors.orange,
      'alta': Colors.red,
    };

    // Obtener la prioridad con valor por defecto 'media'
    final prioridad = resultado['prioridad'] ?? 'media';
    // Obtener el color con valor por defecto Colors.grey
    final colorPrioridad = coloresPrioridad[prioridad] ?? Colors.grey;
    // Calcular si el color es oscuro para ajustar el texto
    final esColorOscuro = colorPrioridad.computeLuminance() > 0.5;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.auto_awesome, color: Color(0xFF005EA4)),
            SizedBox(width: 8),
            Text('Análisis IA'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F7FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '🔍 Clasificación:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      clasificaciones[resultado['clasificacion_ia']] ??
                          resultado['clasificacion_ia'] ??
                          'No clasificado',
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '⚡ Prioridad asignada:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Chip(
                      label: Text(
                        prioridad.toUpperCase(),
                        style: TextStyle(
                          color: esColorOscuro ? Colors.white : Colors.black,
                        ),
                      ),
                      backgroundColor: colorPrioridad,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      '📝 Resumen:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(resultado['resumen_ia'] ?? 'Sin resumen disponible'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green.shade700),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '✅ Incidente #${resultado['id']} registrado correctamente',
                        style: TextStyle(
                          color: Colors.green.shade800,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Cerrar diálogo
              // TODO: Navegar a pantalla de seguimiento
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Próximamente: seguimiento del incidente'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Text('Ver seguimiento'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context); // Cerrar diálogo
              Navigator.pop(context); // Volver atrás
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF005EA4),
            ),
            child: const Text('Aceptar'),
          ),
        ],
      ),
    );
  }

  void _limpiarFormulario() {
    _detailsCtrl.clear();
    _imgFrontal = null;
    _imgLateral = null;
    _imgMotor = null;
    _audioPath = null;
    _prioridad = 'media';
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
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF005EA4),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
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
                // Header
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

                // Selección de vehículo
                const Text(
                  'Vehículo para el reporte',
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
                      'No tienes vehículos registrados. Registra uno antes de reportar un incidente.',
                      style: TextStyle(
                        color: Color(0xFF623300),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                else
                  DropdownButtonFormField<int>(
                    value: _vehiculoSeleccionadoId,
                    decoration: const InputDecoration(
                      labelText: 'Selecciona tu vehículo',
                      prefixIcon: Icon(Icons.directions_car_outlined),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(12)),
                      ),
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

                // Prioridad
                DropdownButtonFormField<String>(
                  value: _prioridad,
                  decoration: const InputDecoration(
                    labelText: 'Prioridad',
                    prefixIcon: Icon(Icons.priority_high_outlined),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(12)),
                    ),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'baja', child: Text('Baja')),
                    DropdownMenuItem(value: 'media', child: Text('Media')),
                    DropdownMenuItem(value: 'alta', child: Text('Alta')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _prioridad = value;
                    });
                  },
                ),
                const SizedBox(height: 20),

                // Evidencia visual
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
                    children: [
                      Expanded(
                        flex: 3,
                        child: _PhotoSlot(
                          label: 'Vista frontal',
                          requiredPhoto: true,
                          icon: Icons.directions_car,
                          image: _imgFrontal,
                          onTap: () => _pickImage('frontal'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: Column(
                          children: [
                            Expanded(
                              child: _PhotoSlot(
                                label: 'Lateral',
                                icon: Icons.view_sidebar_outlined,
                                image: _imgLateral,
                                onTap: () => _pickImage('lateral'),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Expanded(
                              child: _PhotoSlot(
                                label: 'Motor',
                                icon: Icons.precision_manufacturing_outlined,
                                image: _imgMotor,
                                onTap: () => _pickImage('motor'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Descripción del problema
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
                        'Habla claro o escribe una descripción corta del incidente.',
                        style: TextStyle(color: Color(0xFF404752)),
                      ),
                      const SizedBox(height: 12),
                      if (_isRecording)
                        const _WaveformMock()
                      else if (_audioPath != null)
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.green.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                Icons.check_circle,
                                color: Colors.green.shade700,
                              ),
                              const SizedBox(width: 8),
                              const Text('Audio grabado listo para enviar.'),
                            ],
                          ),
                        ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: _startOrStopRecording,
                        icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                        label: Text(
                          _isRecording ? 'Detener grabación' : 'Grabar audio',
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF005EA4),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: _detailsCtrl,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          labelText: 'Detalles del incidente',
                          hintText:
                              'Ej. choque lateral en semáforo, humo en el motor, etc.',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(12)),
                          ),
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

                // Ubicación detectada
                const Text(
                  'Ubicación detectada',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF404752),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 10),
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
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(12)),
                          ),
                        ),
                        validator: (value) {
                          final parsed = double.tryParse((value ?? '').trim());
                          if (parsed == null || parsed < -90 || parsed > 90) {
                            return 'Latitud inválida';
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
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(12)),
                          ),
                        ),
                        validator: (value) {
                          final parsed = double.tryParse((value ?? '').trim());
                          if (parsed == null || parsed < -180 || parsed > 180) {
                            return 'Longitud inválida';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    IconButton(
                      icon: _isGettingLocation
                          ? const CircularProgressIndicator(strokeWidth: 2)
                          : const Icon(Icons.my_location),
                      onPressed: _isGettingLocation
                          ? null
                          : _obtenerUbicacionActual,
                      tooltip: 'Actualizar ubicación',
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFF0F0F0),
                      ),
                    ),
                  ],
                ),

                // Mensaje de error
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
}

// ============================================================
// WIDGETS AUXILIARES
// ============================================================

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
                      'Análisis IA',
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
    this.image,
    this.onTap,
  });

  final String label;
  final IconData icon;
  final bool requiredPhoto;
  final File? image;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        decoration: BoxDecoration(
          color: const Color(0xFFF4F3F3),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFC0C7D4), width: 1.4),
        ),
        child: Center(
          child: image != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.file(
                    image!,
                    width: 90,
                    height: 90,
                    fit: BoxFit.cover,
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, size: 28, color: const Color(0xFF005EA4)),
                    const SizedBox(height: 6),
                    Text(
                      label,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
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
