import 'package:flutter/material.dart';
import '../services/pago_service.dart';
import '../services/comprobante_service.dart';
import '../models/factura_model.dart';
import 'detalle_factura_page.dart';

class MisFacturasPage extends StatefulWidget {
  const MisFacturasPage({super.key});

  @override
  State<MisFacturasPage> createState() => _MisFacturasPageState();
}

class _MisFacturasPageState extends State<MisFacturasPage> {
  final PagoService _pagoService = PagoService();
  final ComprobanteService _comprobanteService = ComprobanteService();
  List<Factura> _facturas = [];
  bool _cargando = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarFacturas();
  }

  Future<void> _cargarFacturas() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final facturas = await _pagoService.getMisFacturas();
      setState(() {
        _facturas = facturas;
        _cargando = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  Future<void> _descargarComprobante(Factura factura) async {
    await _comprobanteService.generarYCompartirPDF(factura);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Facturas'),
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarFacturas,
          ),
        ],
      ),
      body: _buildBody(),
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
              onPressed: _cargarFacturas,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF005EA4),
              ),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    if (_facturas.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.receipt, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'No tienes facturas',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            Text(
              'Las facturas aparecerán aquí cuando un taller emita una',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _cargarFacturas,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _facturas.length,
        itemBuilder: (context, index) {
          final factura = _facturas[index];
          return _buildFacturaCard(factura);
        },
      ),
    );
  }

  Widget _buildFacturaCard(Factura factura) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        children: [
          InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => DetalleFacturaPage(factura: factura),
                ),
              ).then((actualizada) {
                if (actualizada == true) {
                  _cargarFacturas();
                }
              });
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          factura.numeroFactura,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: factura.isPagada
                              ? Colors.green
                              : Colors.orange,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          factura.isPagada ? 'Pagada' : 'Pendiente',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total:'),
                      Text(
                        '\$${factura.total.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: factura.isPagada
                              ? Colors.green
                              : Colors.blue[700],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Fecha: ${_formatDate(factura.creadoEn)}',
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          // Botón de descarga PDF (solo si está pagada)
          if (factura.isPagada)
            Container(
              margin: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
              child: ElevatedButton.icon(
                onPressed: () => _descargarComprobante(factura),
                icon: const Icon(Icons.picture_as_pdf, size: 18),
                label: const Text('Descargar Comprobante'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey[200],
                  foregroundColor: const Color(0xFF005EA4),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  minimumSize: const Size(double.infinity, 40),
                ),
              ),
            ),
          // Botón de pago (solo si está pendiente)
          if (factura.isPendiente)
            Padding(
              padding: const EdgeInsets.only(bottom: 16, left: 16, right: 16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DetalleFacturaPage(factura: factura),
                      ),
                    ).then((actualizada) {
                      if (actualizada == true) {
                        _cargarFacturas();
                      }
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF005EA4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Pagar ahora'),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
