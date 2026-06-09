import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../services/cliente_websocket_service.dart';
import '../../incidents/pages/client_tracking_page.dart';
import '../services/cotizacion_api_service.dart';

class CotizacionesPage extends StatefulWidget {
  static const routeName = '/cotizaciones';

  final int incidenteId;
  final double incidenteLat;
  final double incidenteLng;

  const CotizacionesPage({
    super.key,
    required this.incidenteId,
    required this.incidenteLat,
    required this.incidenteLng,
  });

  @override
  State<CotizacionesPage> createState() => _CotizacionesPageState();
}

class _CotizacionesPageState extends State<CotizacionesPage> {
  List<CotizacionModel> _cotizaciones = [];
  bool _cargando = true;
  bool _aceptando = false;
  String? _error;

  final ClienteWebSocketService _wsService = ClienteWebSocketService();
  StreamSubscription? _wsSub;

  @override
  void initState() {
    super.initState();
    _cargarCotizaciones();
    _conectarWebSocket();
  }

  @override
  void dispose() {
    _wsSub?.cancel();
    super.dispose();
  }

  void _conectarWebSocket() {
    _wsService.connect(widget.incidenteId.toString());

    // Escuchar nuevas cotizaciones en tiempo real
    _wsSub = _wsService.onNuevaCotizacion.listen((data) {
      if (mounted) {
        _cargarCotizaciones();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Nueva cotización de ${data['taller_nombre'] ?? 'un taller'}'),
            backgroundColor: Colors.blue,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    });
  }

  Future<void> _cargarCotizaciones() async {
    setState(() { _cargando = true; _error = null; });
    try {
      final data = await CotizacionApiService.instance.getCotizacionesIncidente(widget.incidenteId);
      if (mounted) setState(() { _cotizaciones = data; _cargando = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _cargando = false; });
    }
  }

  Future<void> _aceptarCotizacion(CotizacionModel cotizacion) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar selección'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                cotizacion.tallerNombre,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 10),
              if (cotizacion.items.isNotEmpty) ...[
                const Text('Servicios:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 4),
                ...cotizacion.items.map((item) {
                  final precio = (item['precio'] as num?)?.toDouble() ?? 0.0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 3),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text('• ${item['nombre']}', style: const TextStyle(fontSize: 13))),
                        Text('Bs. ${precio.toStringAsFixed(2)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  );
                }),
                const Divider(height: 16),
              ],
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    'Bs. ${cotizacion.montoTotal.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF005EA4), fontSize: 15),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text('Tiempo: ${cotizacion.tiempoFormateado}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
              if (cotizacion.notas != null && cotizacion.notas!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Notas: ${cotizacion.notas}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Aceptar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmar != true) return;

    setState(() => _aceptando = true);
    try {
      await CotizacionApiService.instance.aceptarCotizacion(cotizacion.id);
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ClientTrackingPage(
              incidenteId: widget.incidenteId,
              incidenteLat: widget.incidenteLat,
              incidenteLng: widget.incidenteLng,
            ),
          ),
        );
      }
    } catch (e) {
      setState(() => _aceptando = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      appBar: AppBar(
        title: const Text('Cotizaciones recibidas'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _cargarCotizaciones),
        ],
      ),
      body: Column(
        children: [
          // Banner informativo
          Container(
            width: double.infinity,
            color: Colors.blue.shade700,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: const Row(
              children: [
                Icon(Icons.info_outline, color: Colors.white, size: 18),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Los talleres cercanos están enviando sus cotizaciones. Selecciona la que mejor te convenga.',
                    style: TextStyle(color: Colors.white, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),

          if (_cargando)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 48),
                    const SizedBox(height: 12),
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: _cargarCotizaciones, child: const Text('Reintentar')),
                  ],
                ),
              ),
            )
          else if (_cotizaciones.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.hourglass_empty, size: 64, color: Colors.orange),
                    const SizedBox(height: 16),
                    const Text(
                      'Esperando cotizaciones...',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Los talleres están revisando tu solicitud.',
                      style: TextStyle(color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    OutlinedButton.icon(
                      onPressed: _cargarCotizaciones,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Actualizar'),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _cargarCotizaciones,
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _cotizaciones.length,
                  itemBuilder: (ctx, i) => _CotizacionCard(
                    cotizacion: _cotizaciones[i],
                    onAceptar: _aceptando ? null : () => _aceptarCotizacion(_cotizaciones[i]),
                    incidenteLat: widget.incidenteLat,
                    incidenteLng: widget.incidenteLng,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ============================================================
// TARJETA DE COTIZACIÓN
// ============================================================
class _CotizacionCard extends StatelessWidget {
  final CotizacionModel cotizacion;
  final VoidCallback? onAceptar;
  final double incidenteLat;
  final double incidenteLng;

  const _CotizacionCard({
    required this.cotizacion,
    required this.onAceptar,
    required this.incidenteLat,
    required this.incidenteLng,
  });

  double? _calcularDistancia() {
    if (cotizacion.tallerLatitud == null || cotizacion.tallerLongitud == null) return null;
    return _haversine(incidenteLat, incidenteLng, cotizacion.tallerLatitud!, cotizacion.tallerLongitud!);
  }

  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371.0;
    final dLat = (lat2 - lat1) * 3.14159265358979 / 180;
    final dLon = (lon2 - lon1) * 3.14159265358979 / 180;
    final a = _sin2(dLat / 2) + _cos(lat1) * _cos(lat2) * _sin2(dLon / 2);
    final c = 2 * _asin(_sqrt(a));
    return R * c;
  }

  double _sin2(double x) { final s = _sin(x); return s * s; }
  double _sin(double x) => x - x * x * x / 6 + x * x * x * x * x / 120;
  double _cos(double x) { x = x * 3.14159265358979 / 180; return 1 - x * x / 2; }
  double _asin(double x) => x + x * x * x / 6;
  double _sqrt(double x) {
    if (x <= 0) return 0;
    double r = x;
    for (int i = 0; i < 10; i++) r = (r + x / r) / 2;
    return r;
  }

  @override
  Widget build(BuildContext context) {
    final distancia = _calcularDistancia();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.07), blurRadius: 10, offset: const Offset(0, 3))],
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cabecera del taller
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.06),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primary,
                  radius: 20,
                  child: Text(
                    cotizacion.tallerNombre.substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cotizacion.tallerNombre,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      if (distancia != null)
                        Text(
                          '${distancia.toStringAsFixed(1)} km de distancia',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Métricas: Precio y Tiempo (lo más importante al frente)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                // Precio
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Costo estimado', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text(
                        'Bs. ${cotizacion.montoTotal.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                    ],
                  ),
                ),
                // Separador vertical
                Container(width: 1, height: 48, color: Colors.grey.shade200),
                const SizedBox(width: 16),
                // Tiempo de reparación — DESTACADO
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Tiempo de reparación', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.build_circle, color: Colors.orange, size: 18),
                          const SizedBox(width: 4),
                          Text(
                            cotizacion.tiempoFormateado,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.orange,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Desglose de servicios
          if (cotizacion.items.isNotEmpty) ...[
            const Divider(height: 1, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Servicios incluidos',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...cotizacion.items.map((item) {
                    final precio = (item['precio'] as num?)?.toDouble() ?? 0.0;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 5),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF005EA4)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              item['nombre'] as String? ?? '',
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                          Text(
                            'Bs. ${precio.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF005EA4),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],

          // Notas
          if (cotizacion.notas != null && cotizacion.notas!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.notes, size: 16, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        cotizacion.notas!,
                        style: const TextStyle(fontSize: 13, color: Colors.black54),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Botón Aceptar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onAceptar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text('Seleccionar este taller', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
