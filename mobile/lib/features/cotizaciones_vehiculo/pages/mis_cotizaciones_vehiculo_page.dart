import 'package:flutter/material.dart';

import '../services/cotizacion_vehiculo_service.dart';

class MisCotizacionesVehiculoPage extends StatefulWidget {
  static const routeName = '/mis-cotizaciones-vehiculo';
  const MisCotizacionesVehiculoPage({super.key});

  @override
  State<MisCotizacionesVehiculoPage> createState() => _MisCotizacionesVehiculoPageState();
}

class _MisCotizacionesVehiculoPageState extends State<MisCotizacionesVehiculoPage> {
  List<CotizacionVehiculoModel> _solicitudes = [];
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() => _cargando = true);
    try {
      final data = await CotizacionVehiculoService.getMisSolicitudes();
      setState(() { _solicitudes = data; _cargando = false; });
    } catch (_) {
      setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
        title: const Text('Mis Cotizaciones', style: TextStyle(fontWeight: FontWeight.w700)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _cargar),
        ],
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF005EA4)))
          : _solicitudes.isEmpty
              ? _buildEmpty()
              : RefreshIndicator(
                  onRefresh: _cargar,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _solicitudes.length,
                    itemBuilder: (_, i) => _CotizacionCard(
                      solicitud: _solicitudes[i],
                      onCerrar: () async {
                        await CotizacionVehiculoService.cerrarSolicitud(_solicitudes[i].id);
                        _cargar();
                      },
                    ),
                  ),
                ),
    );
  }

  Widget _buildEmpty() => Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(color: const Color(0xFFE8F4FF), borderRadius: BorderRadius.circular(20)),
            child: const Icon(Icons.request_quote_outlined, size: 42, color: Color(0xFF005EA4)),
          ),
          const SizedBox(height: 16),
          const Text('Sin solicitudes de cotización',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          const Text('Visita un taller cercano y solicita\nuna cotización para tu vehículo.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
        ]),
      );
}

// ────────────────────────────────────────────
// CARD DE COTIZACIÓN
// ────────────────────────────────────────────

class _CotizacionCard extends StatefulWidget {
  final CotizacionVehiculoModel solicitud;
  final VoidCallback onCerrar;
  const _CotizacionCard({required this.solicitud, required this.onCerrar});
  @override
  State<_CotizacionCard> createState() => _CotizacionCardState();
}

class _CotizacionCardState extends State<_CotizacionCard> {
  bool _expandido = false;

  @override
  Widget build(BuildContext context) {
    final s = widget.solicitud;
    final tallerNombre = (s.taller?['nombre'] as String?) ?? 'Taller #${s.tallerId}';
    final respondida = s.estado == 'respondida';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: respondida ? const Color(0xFF86EFAC) : const Color(0xFFE5E7EB),
          width: respondida ? 2 : 1.5,
        ),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 10, offset: Offset(0, 3))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: respondida ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(17)),
          ),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: respondida
                      ? [const Color(0xFF16A34A), const Color(0xFF15803D)]
                      : [const Color(0xFFFF8F06), const Color(0xFFFF6B00)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                respondida ? Icons.check_circle_outline : Icons.car_repair,
                color: Colors.white, size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tallerNombre,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(_formatFecha(s.creadoEn),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ])),
            _EstadoBadge(estado: s.estado),
          ]),
        ),

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Descripción enviada
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.description_outlined, size: 16, color: Color(0xFF64748B)),
                const SizedBox(width: 8),
                Expanded(child: Text(s.descripcion,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF374151), height: 1.4))),
              ]),
            ),
            const SizedBox(height: 12),

            // Cotización recibida
            if (respondida && s.respuestaItems.isNotEmpty) ...[
              _buildCotizacionRecibida(s),
            ] else if (!respondida) ...[
              _buildPendiente(),
            ],
          ]),
        ),

        // Botón cerrar (sólo si respondida y no cerrada)
        if (respondida)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _expandido = !_expandido),
                  icon: Icon(_expandido ? Icons.expand_less : Icons.expand_more, size: 18),
                  label: Text(_expandido ? 'Ocultar detalle' : 'Ver detalle completo'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF005EA4),
                    side: const BorderSide(color: Color(0xFF005EA4)),
                    minimumSize: Size.zero,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              if (s.estado == 'respondida') ...[
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  onPressed: () => _confirmarCerrar(context),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Cerrar'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF64748B),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    minimumSize: Size.zero,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ]),
          )
        else
          const SizedBox(height: 16),

        // Detalle expandido
        if (_expandido && respondida) _buildDetalleExpandido(s),
      ]),
    );
  }

  Widget _buildCotizacionRecibida(CotizacionVehiculoModel s) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(
          width: 6, height: 6,
          decoration: const BoxDecoration(color: Color(0xFF16A34A), shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        const Text('Cotización recibida',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF16A34A))),
      ]),
      const SizedBox(height: 10),
      // Tabla de items
      Container(
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFDCFCE7)),
          borderRadius: BorderRadius.circular(12),
          color: const Color(0xFFF0FDF4),
        ),
        child: Column(children: [
          ...s.respuestaItems.map((item) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFDCFCE7))),
                ),
                child: Row(children: [
                  const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF16A34A)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(item.nombre,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF374151)))),
                  Text('Bs. ${item.precio.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFF065F46))),
                ]),
              )),
          // Total
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF065F46).withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(11)),
            ),
            child: Row(children: [
              const Icon(Icons.receipt_long, size: 16, color: Color(0xFF065F46)),
              const SizedBox(width: 8),
              const Expanded(child: Text('Total estimado',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF065F46)))),
              Text('Bs. ${s.respuestaMonto?.toStringAsFixed(2) ?? '—'}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF065F46))),
            ]),
          ),
        ]),
      ),
      // Tiempo estimado
      if (s.respuestaTiempoHoras != null) ...[
        const SizedBox(height: 8),
        Row(children: [
          const Icon(Icons.schedule, size: 14, color: Color(0xFF64748B)),
          const SizedBox(width: 4),
          Text('Tiempo estimado: ${_formatHoras(s.respuestaTiempoHoras!)}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        ]),
      ],
      const SizedBox(height: 4),
    ]);
  }

  Widget _buildPendiente() => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: const Row(children: [
          Icon(Icons.hourglass_empty, color: Color(0xFFD97706), size: 20),
          SizedBox(width: 10),
          Expanded(
            child: Text('Esperando respuesta del taller...',
                style: TextStyle(color: Color(0xFFD97706), fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ]),
      );

  Widget _buildDetalleExpandido(CotizacionVehiculoModel s) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Diagnóstico / Descripción del taller',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
          const SizedBox(height: 6),
          Text(s.respuestaDescripcion ?? '—',
              style: const TextStyle(fontSize: 13, color: Color(0xFF374151), height: 1.5)),
          if (s.respondidoEn != null) ...[
            const Divider(height: 20),
            Text('Respondida el ${_formatFechaLarga(s.respondidoEn!)}',
                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ]),
      );

  void _confirmarCerrar(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cerrar solicitud', style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text('¿Confirmas que ya no necesitas esta cotización?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          ElevatedButton(
            onPressed: () { Navigator.pop(context); widget.onCerrar(); },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF005EA4)),
            child: const Text('Cerrar solicitud', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  String _formatFecha(DateTime d) {
    final now = DateTime.now();
    final diff = now.difference(d);
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours} h';
    return '${d.day}/${d.month}/${d.year}';
  }

  String _formatFechaLarga(DateTime d) =>
      '${d.day}/${d.month}/${d.year} a las ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  String _formatHoras(double h) {
    final horas = h.floor();
    final min = ((h - horas) * 60).round();
    return min > 0 ? '${horas}h ${min}min' : '${horas}h';
  }
}

class _EstadoBadge extends StatelessWidget {
  final String estado;
  const _EstadoBadge({required this.estado});

  @override
  Widget build(BuildContext context) {
    Color bg, fg;
    String label;
    switch (estado) {
      case 'respondida':
        bg = const Color(0xFFDCFCE7); fg = const Color(0xFF065F46); label = 'Respondida'; break;
      case 'cerrada':
        bg = const Color(0xFFE5E7EB); fg = const Color(0xFF374151); label = 'Cerrada'; break;
      default:
        bg = const Color(0xFFFEF3C7); fg = const Color(0xFF92400E); label = 'Pendiente';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w700, fontSize: 11)),
    );
  }
}
