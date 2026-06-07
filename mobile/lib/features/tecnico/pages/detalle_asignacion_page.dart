import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart' as stripe;
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../services/tecnico_websocket_service.dart';
import '../models/asignacion_tecnico_model.dart';
import '../services/tecnico_api_service.dart';
import 'tracking_en_camino_page.dart';

class DetalleAsignacionPage extends StatefulWidget {
  final AsignacionTecnico asignacion;

  const DetalleAsignacionPage({super.key, required this.asignacion});

  @override
  State<DetalleAsignacionPage> createState() => _DetalleAsignacionPageState();
}

class _DetalleAsignacionPageState extends State<DetalleAsignacionPage> {
  bool _enviandoUbicacion = false;
  bool _isLoading = false;
  Position? _currentPosition;
  Timer? _locationTimer;
  bool _isSendingLocation = false;

  @override
  void initState() {
    super.initState();
    _verificarRedireccion(); // ✅ NUEVO: Redirigir si ya está en camino
    _verificarPermisos();
  }

  /// ✅ NUEVO: Redirigir automáticamente al mapa si el técnico ya está en camino
  void _verificarRedireccion() {
    if (widget.asignacion.estado == 'en_camino' ||
        widget.asignacion.estado == 'en_proceso') {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => TrackingEnCaminoPage(asignacion: widget.asignacion),
          ),
        );
      });
    }
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    // ✅ NO desconectar el WebSocket aquí - TrackingEnCaminoPage lo necesita
    super.dispose();
  }

  Future<void> _verificarPermisos() async {
    final status = await Permission.location.request();
    if (status.isGranted) {
      _obtenerUbicacion();
    }
  }

  Future<void> _obtenerUbicacion() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      if (mounted) {
        setState(() {
          _currentPosition = position;
        });
      }
    } catch (e) {
      print('❌ Error obteniendo ubicación: $e');
    }
  }

  void _startContinuousLocation() {
    _locationTimer = Timer.periodic(const Duration(seconds: 20), (timer) async {
      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
        );

        if (mounted) {
          setState(() {
            _currentPosition = position;
          });
        }

        if (_isSendingLocation) {
          TecnicoWebSocketService().updateLocation(
            position.latitude,
            position.longitude,
          );
        }
      } catch (e) {
        print('❌ Error obteniendo ubicación: $e');
      }
    });
  }

  Future<void> _iniciarViaje() async {
    setState(() => _isLoading = true);

    try {
      await TecnicoApiService.instance.actualizarEstado(
        widget.asignacion.incidenteId,
        'en_camino',
      );

      _isSendingLocation = true;

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => TrackingEnCaminoPage(asignacion: widget.asignacion),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _finalizarServicio() async {
    _isSendingLocation = false;
    _locationTimer?.cancel();
    TecnicoWebSocketService().stopSendingLocation();
    TecnicoWebSocketService().disconnect();

    setState(() => _isLoading = true);

    try {
      await TecnicoApiService.instance.actualizarEstado(
        widget.asignacion.incidenteId,
        'finalizado',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Servicio finalizado'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _abrirGoogleMaps() async {
    final url =
        'https://www.google.com/maps?q=${widget.asignacion.latitud},${widget.asignacion.longitud}';
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir Google Maps')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final asignacion = widget.asignacion;

    return Scaffold(
      appBar: AppBar(
        title: Text('Incidente #${asignacion.incidenteId}'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildEstadoChip(asignacion.estado),
            const SizedBox(height: 16),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Información del Cliente',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _infoRow(
                      Icons.person,
                      'Nombre',
                      asignacion.clienteNombre.isNotEmpty
                          ? asignacion.clienteNombre
                          : 'No disponible',
                    ),
                    const SizedBox(height: 8),
                    _infoRow(
                      Icons.phone,
                      'Teléfono',
                      asignacion.clienteTelefono.isNotEmpty
                          ? asignacion.clienteTelefono
                          : 'No disponible',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            if (_currentPosition != null && _enviandoUbicacion)
              Card(
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.gps_fixed, color: Colors.blue.shade700),
                          const SizedBox(width: 8),
                          const Text(
                            'Tu ubicación actual',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Lat: ${_currentPosition!.latitude.toStringAsFixed(6)}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      Text(
                        'Lng: ${_currentPosition!.longitude.toStringAsFixed(6)}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),

            if (_currentPosition != null && _enviandoUbicacion)
              const SizedBox(height: 12),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Ubicación del Incidente',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _infoRow(
                      Icons.location_on,
                      'Dirección',
                      asignacion.direccion.isNotEmpty
                          ? asignacion.direccion
                          : '${asignacion.latitud.toStringAsFixed(6)}, ${asignacion.longitud.toStringAsFixed(6)}',
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton.icon(
                      onPressed: _abrirGoogleMaps,
                      icon: const Icon(Icons.map),
                      label: const Text('Abrir en Maps'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey.shade200,
                        foregroundColor: Colors.black87,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Detalles del Incidente',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _infoRow(
                      Icons.category,
                      'Clasificación',
                      asignacion.clasificacion.isNotEmpty
                          ? asignacion.clasificacion
                          : 'Sin clasificar',
                    ),
                    const SizedBox(height: 8),
                    _infoRow(
                      Icons.description,
                      'Descripción',
                      asignacion.descripcion.isNotEmpty
                          ? asignacion.descripcion
                          : 'Sin descripción',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            if (asignacion.estado == 'pendiente' ||
                asignacion.estado == 'taller_asignado')
              ElevatedButton(
                onPressed: _isLoading ? null : _iniciarViaje,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        '🚐 Iniciar Viaje',
                        style: TextStyle(fontSize: 16),
                      ),
              ),

            if (asignacion.estado == 'en_camino' ||
                asignacion.estado == 'en_proceso')
              Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.location_on, color: Colors.blue),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Compartiendo ubicación en tiempo real',
                            style: TextStyle(fontWeight: FontWeight.w500),
                          ),
                        ),
                        Icon(Icons.animation, color: Colors.blue),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _finalizarServicio,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      minimumSize: const Size(double.infinity, 50),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            '✅ Finalizar Servicio',
                            style: TextStyle(fontSize: 16),
                          ),
                  ),
                ],
              ),

            if (asignacion.estado == 'atencion' ||
                asignacion.estado == 'en_atencion')
              Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.build_circle, color: Colors.green.shade700),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'En atención — realiza el servicio',
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: Colors.green.shade800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _finalizarServicio,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      minimumSize: const Size(double.infinity, 50),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('✅ Finalizar Servicio',
                            style: TextStyle(fontSize: 16)),
                  ),
                ],
              ),

            if (asignacion.estado == 'finalizado')
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Servicio finalizado',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 12),
        SizedBox(
          width: 80,
          child: Text(
            label,
            style: const TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    );
  }

  Widget _buildEstadoChip(String estado) {
    Color color;
    String texto;

    switch (estado) {
      case 'pendiente':
        color = Colors.orange;
        texto = 'Pendiente - Esperando iniciar viaje';
        break;
      case 'taller_asignado':
        color = Colors.teal;
        texto = 'Asignado - Listo para iniciar viaje';
        break;
      case 'en_camino':
      case 'en_proceso':
        color = Colors.blue;
        texto = 'En camino - Compartiendo ubicación';
        break;
      case 'atencion':
      case 'en_atencion':
        color = Colors.green;
        texto = 'En atención';
        break;
      case 'finalizado':
        color = Colors.grey;
        texto = 'Finalizado';
        break;
      default:
        color = Colors.grey;
        texto = estado;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(
            texto,
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
