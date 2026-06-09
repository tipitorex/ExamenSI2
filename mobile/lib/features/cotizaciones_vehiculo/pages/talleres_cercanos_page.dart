import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';

import '../services/cotizacion_vehiculo_service.dart';

class TalleresCercanosPage extends StatefulWidget {
  static const routeName = '/talleres-cercanos';
  const TalleresCercanosPage({super.key});

  @override
  State<TalleresCercanosPage> createState() => _TalleresCercanosPageState();
}

class _TalleresCercanosPageState extends State<TalleresCercanosPage> {
  final _mapCtrl = MapController();

  LatLng? _miPosicion;
  List<TallerCercano> _talleres = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _obtenerUbicacion();
  }

  Future<void> _obtenerUbicacion() async {
    setState(() { _cargando = true; _error = null; });
    try {
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) {
        setState(() { _error = 'Permiso de ubicación denegado permanentemente.'; _cargando = false; });
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      final mi = LatLng(pos.latitude, pos.longitude);
      final talleres = await CotizacionVehiculoService.getTalleresCercanos(
        lat: pos.latitude, lng: pos.longitude,
      );
      setState(() {
        _miPosicion = mi;
        _talleres = talleres;
        _cargando = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapCtrl.move(mi, 13.0);
      });
    } catch (e) {
      setState(() { _error = 'No se pudo obtener la ubicación.'; _cargando = false; });
    }
  }

  void _abrirTaller(TallerCercano taller) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TallerBottomSheet(taller: taller),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
        title: const Text('Talleres Cercanos', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _obtenerUbicacion,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF005EA4)))
          : _error != null
              ? _ErrorWidget(mensaje: _error!, onRetry: _obtenerUbicacion)
              : Stack(
                  children: [
                    FlutterMap(
                      mapController: _mapCtrl,
                      options: MapOptions(
                        initialCenter: _miPosicion ?? const LatLng(-16.5, -68.15),
                        initialZoom: 13.0,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName: 'com.ceroespera.mobile',
                        ),
                        // Radio 10 km
                        if (_miPosicion != null)
                          CircleLayer(circles: [
                            CircleMarker(
                              point: _miPosicion!,
                              radius: 10000,
                              useRadiusInMeter: true,
                              color: const Color(0xFF005EA4).withOpacity(0.08),
                              borderColor: const Color(0xFF005EA4).withOpacity(0.3),
                              borderStrokeWidth: 1.5,
                            ),
                          ]),
                        MarkerLayer(markers: [
                          // Mi posición
                          if (_miPosicion != null)
                            Marker(
                              point: _miPosicion!,
                              width: 40, height: 40,
                              child: const _MiPosicionMarker(),
                            ),
                          // Talleres
                          ..._talleres.map((t) => Marker(
                                point: LatLng(t.latitud, t.longitud),
                                width: 44, height: 56,
                                child: GestureDetector(
                                  onTap: () => _abrirTaller(t),
                                  child: const _TallerMarker(),
                                ),
                              )),
                        ]),
                      ],
                    ),
                    // Panel inferior con lista de talleres
                    Positioned(
                      bottom: 0, left: 0, right: 0,
                      child: _TalleresList(
                        talleres: _talleres,
                        onTap: _abrirTaller,
                      ),
                    ),
                  ],
                ),
    );
  }
}

// ────────────────────────────────────────────
// MARKERS
// ────────────────────────────────────────────

class _MiPosicionMarker extends StatelessWidget {
  const _MiPosicionMarker();
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          color: const Color(0xFF005EA4),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2.5),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
        ),
        child: const Icon(Icons.my_location, color: Colors.white, size: 18),
      );
}

class _TallerMarker extends StatelessWidget {
  const _TallerMarker();
  @override
  Widget build(BuildContext context) => Column(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFFFF8F06),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
            ),
            child: const Icon(Icons.car_repair, color: Colors.white, size: 18),
          ),
          CustomPaint(painter: _TrianglePainter(), size: const Size(12, 8)),
        ],
      );
}

class _TrianglePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..color = const Color(0xFFFF8F06);
    final path = ui.Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(path, p);
  }
  @override
  bool shouldRepaint(_) => false;
}

// ────────────────────────────────────────────
// LISTA HORIZONTAL EN PANEL INFERIOR
// ────────────────────────────────────────────

class _TalleresList extends StatelessWidget {
  final List<TallerCercano> talleres;
  final void Function(TallerCercano) onTap;
  const _TalleresList({required this.talleres, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (talleres.isEmpty) {
      return Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
        ),
        child: const Row(children: [
          Icon(Icons.info_outline, color: Color(0xFF64748B)),
          SizedBox(width: 10),
          Text('No hay talleres en un radio de 10 km',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
        ]),
      );
    }
    return Container(
      height: 120,
      margin: const EdgeInsets.only(bottom: 12),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        scrollDirection: Axis.horizontal,
        itemCount: talleres.length,
        itemBuilder: (_, i) => _TallerChip(taller: talleres[i], onTap: onTap),
      ),
    );
  }
}

class _TallerChip extends StatelessWidget {
  final TallerCercano taller;
  final void Function(TallerCercano) onTap;
  const _TallerChip({required this.taller, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: () => onTap(taller),
        child: Container(
          width: 180,
          margin: const EdgeInsets.only(right: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 8)],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(children: [
                Container(
                  width: 28, height: 28,
                  decoration: const BoxDecoration(color: Color(0xFFFFF3E0), shape: BoxShape.circle),
                  child: const Icon(Icons.car_repair, color: Color(0xFFFF8F06), size: 15),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(taller.nombre,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
              ]),
              const SizedBox(height: 6),
              Text('📍 ${taller.distanciaKm.toStringAsFixed(1)} km',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 2),
              Text('${taller.servicios.length} servicios',
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF005EA4),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('Ver info', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
        ),
      );
}

// ────────────────────────────────────────────
// BOTTOM SHEET DEL TALLER
// ────────────────────────────────────────────

class _TallerBottomSheet extends StatefulWidget {
  final TallerCercano taller;
  const _TallerBottomSheet({required this.taller});
  @override
  State<_TallerBottomSheet> createState() => _TallerBottomSheetState();
}

class _TallerBottomSheetState extends State<_TallerBottomSheet>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
  }
  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final t = widget.taller;
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(children: [
        // Handle
        Center(
          child: Container(
            width: 40, height: 4,
            margin: const EdgeInsets.only(top: 12),
            decoration: BoxDecoration(color: const Color(0xFFE5E7EB), borderRadius: BorderRadius.circular(4)),
          ),
        ),
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Row(children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFFF8F06), Color(0xFFFF6B00)]),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.car_repair, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t.nombre, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              if (t.direccion != null)
                Text(t.direccion!, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F4FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text('${t.distanciaKm.toStringAsFixed(1)} km',
                  style: const TextStyle(color: Color(0xFF005EA4), fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ]),
        ),
        // Tabs
        Container(
          margin: const EdgeInsets.fromLTRB(20, 14, 20, 0),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: TabBar(
            controller: _tab,
            indicator: BoxDecoration(color: const Color(0xFF005EA4), borderRadius: BorderRadius.circular(10)),
            labelColor: Colors.white,
            unselectedLabelColor: const Color(0xFF64748B),
            labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            tabs: [
              Tab(text: 'Servicios (${t.servicios.length})'),
              const Tab(text: 'Pedir Cotización'),
            ],
          ),
        ),
        // Tab content
        Expanded(child: TabBarView(controller: _tab, children: [
          _ServiciosTab(servicios: t.servicios),
          _CotizarTab(taller: t),
        ])),
      ]),
    );
  }
}

// ────────────────────────────────────────────
// TAB: SERVICIOS
// ────────────────────────────────────────────

class _ServiciosTab extends StatelessWidget {
  final List<ServicioCatalogo> servicios;
  const _ServiciosTab({required this.servicios});

  @override
  Widget build(BuildContext context) {
    if (servicios.isEmpty) {
      return const Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.build_circle_outlined, size: 48, color: Color(0xFFCBD5E1)),
          SizedBox(height: 10),
          Text('Este taller aún no publicó su catálogo',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
        ]),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: servicios.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final s = servicios[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF3E0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.build, color: Color(0xFFFF8F06), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.nombre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              if (s.descripcion != null && s.descripcion!.isNotEmpty)
                Text(s.descripcion!, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              if (s.tiempoEstimadoMinutos != null)
                Text('⏱ ${_formatMin(s.tiempoEstimadoMinutos!)}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
            ])),
            if (s.precioBase != null)
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Text('desde', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                Text('Bs. ${s.precioBase!.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF005EA4))),
              ]),
          ]),
        );
      },
    );
  }

  String _formatMin(int min) {
    if (min < 60) return '${min}min';
    final h = min ~/ 60;
    final m = min % 60;
    return m > 0 ? '${h}h ${m}min' : '${h}h';
  }
}

// ────────────────────────────────────────────
// TAB: PEDIR COTIZACIÓN
// ────────────────────────────────────────────

class _CotizarTab extends StatefulWidget {
  final TallerCercano taller;
  const _CotizarTab({required this.taller});
  @override
  State<_CotizarTab> createState() => _CotizarTabState();
}

class _CotizarTabState extends State<_CotizarTab> {
  final _ctrl = TextEditingController();
  File? _imagen;
  bool _enviando = false;
  bool _enviado = false;

  Future<void> _pickImage() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _imagen = File(picked.path));
  }

  Future<void> _enviar() async {
    if (_ctrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Describe el problema de tu vehículo')));
      return;
    }
    setState(() => _enviando = true);
    try {
      await CotizacionVehiculoService.crearSolicitud(
        tallerId: widget.taller.id,
        descripcion: _ctrl.text.trim(),
        imagen: _imagen,
      );
      setState(() { _enviado = true; _enviando = false; });
    } catch (e) {
      setState(() => _enviando = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (_enviado) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 72, height: 72,
            decoration: const BoxDecoration(color: Color(0xFFDCFCE7), shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_outline, color: Color(0xFF16A34A), size: 40),
          ),
          const SizedBox(height: 16),
          const Text('¡Solicitud enviada!',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          const Text('El taller recibirá tu solicitud\ny te enviará su cotización.',
              textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF64748B))),
          const SizedBox(height: 20),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ]),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('¿Qué le pasa a tu vehículo?',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text('Describe el problema con el mayor detalle posible.',
            style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        const SizedBox(height: 12),
        TextField(
          controller: _ctrl,
          maxLines: 4,
          maxLength: 500,
          decoration: InputDecoration(
            hintText: 'Ej: El motor hace un ruido extraño al arrancar, además veo humo blanco...',
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
          ),
        ),
        const SizedBox(height: 16),
        const Text('Foto del vehículo (opcional)',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: _pickImage,
          child: Container(
            width: double.infinity,
            height: _imagen != null ? 180 : 100,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _imagen != null ? const Color(0xFF005EA4) : const Color(0xFFE5E7EB),
                style: _imagen != null ? BorderStyle.solid : BorderStyle.solid,
                width: _imagen != null ? 2 : 1.5,
              ),
            ),
            child: _imagen != null
                ? Stack(fit: StackFit.expand, children: [
                    ClipRRect(
                        borderRadius: BorderRadius.circular(11),
                        child: Image.file(_imagen!, fit: BoxFit.cover)),
                    Positioned(
                      top: 8, right: 8,
                      child: GestureDetector(
                        onTap: () => setState(() => _imagen = null),
                        child: Container(
                          decoration: const BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                          padding: const EdgeInsets.all(4),
                          child: const Icon(Icons.close, color: Colors.white, size: 16),
                        ),
                      ),
                    ),
                  ])
                : const Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.add_photo_alternate_outlined, color: Color(0xFF94A3B8), size: 32),
                    SizedBox(height: 6),
                    Text('Agregar foto', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                  ]),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _enviando ? null : _enviar,
            icon: _enviando
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.send, size: 18),
            label: Text(_enviando ? 'Enviando...' : 'Enviar solicitud de cotización'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF005EA4),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ]),
    );
  }
}

// ────────────────────────────────────────────
// WIDGET ERROR
// ────────────────────────────────────────────

class _ErrorWidget extends StatelessWidget {
  final String mensaje;
  final VoidCallback onRetry;
  const _ErrorWidget({required this.mensaje, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.location_off, size: 64, color: Color(0xFFCBD5E1)),
            const SizedBox(height: 16),
            Text(mensaje, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF64748B))),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005EA4), foregroundColor: Colors.white),
            ),
          ]),
        ),
      );
}
