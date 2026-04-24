import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart' as stripe;
import '../services/pago_service.dart';
import '../models/factura_model.dart';

class DetalleFacturaPage extends StatefulWidget {
  final Factura factura;

  const DetalleFacturaPage({super.key, required this.factura});

  @override
  State<DetalleFacturaPage> createState() => _DetalleFacturaPageState();
}

class _DetalleFacturaPageState extends State<DetalleFacturaPage> {
  late Factura _factura;
  final PagoService _pagoService = PagoService();
  bool _pagando = false;

  @override
  void initState() {
    super.initState();
    _factura = widget.factura;
  }

  Future<void> _iniciarPago() async {
    setState(() {
      _pagando = true;
    });

    try {
      final successUrl = 'tuapp://payment/success';
      final cancelUrl = 'tuapp://payment/cancel';

      final response = await _pagoService.iniciarPago(
        facturaId: _factura.id,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
      );

      await stripe.Stripe.instance.initPaymentSheet(
        paymentSheetParameters: stripe.SetupPaymentSheetParameters(
          paymentIntentClientSecret: response['payment_intent_client_secret'],
          merchantDisplayName: 'Emergencias Vehiculares',
          style: ThemeMode.light,
        ),
      );

      await stripe.Stripe.instance.presentPaymentSheet();

      final estaPagada = await _pagoService.verificarPago(_factura.id);

      if (estaPagada) {
        _mostrarMensajeExito();
      } else {
        _mostrarMensajeError(
          'El pago se realizó pero no se pudo verificar. Revisa la lista de facturas.',
        );
      }
    } catch (e) {
      _mostrarMensajeError(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          _pagando = false;
        });
      }
    }
  }

  void _mostrarMensajeExito() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 64,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              '¡Pago Completado!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF005EA4),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Tu pago ha sido procesado exitosamente.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFD3E4FF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    'Monto pagado',
                    style: TextStyle(
                      fontSize: 12,
                      color: const Color(0xFF005EA4).withOpacity(0.7),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${_factura.total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF005EA4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context, true);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF005EA4),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text(
                'Aceptar',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _mostrarMensajeError(String error) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.error, color: Colors.red),
            SizedBox(width: 8),
            Text('Error de pago'),
          ],
        ),
        content: Text(error),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(
          _factura.isPagada ? 'Detalle de Factura' : 'Secure Checkout',
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF005EA4),
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: _factura.isPagada
            ? []
            : [
                Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: const Icon(Icons.security, color: Color(0xFF005EA4)),
                ),
              ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildEstadoBadge(),
                  const SizedBox(height: 16),
                  _buildServiceSummary(),
                  const SizedBox(height: 24),
                  const Text(
                    'Detalles del Servicio',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  _buildBillingDetails(),
                  const SizedBox(height: 24),
                  if (_factura.isPagada) ...[
                    const Text(
                      'Información de la Factura',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildInformacionAdicional(),
                    const SizedBox(height: 24),
                  ],
                  if (!_factura.isPagada) _buildSecurityNote(),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
          if (!_factura.isPagada) _buildFloatingButton(),
        ],
      ),
    );
  }

  Widget _buildEstadoBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: _factura.isPagada ? Colors.green[50] : Colors.orange[50],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _factura.isPagada ? Colors.green : Colors.orange,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _factura.isPagada ? Icons.check_circle : Icons.pending,
            size: 20,
            color: _factura.isPagada ? Colors.green : Colors.orange,
          ),
          const SizedBox(width: 8),
          Text(
            _factura.isPagada ? 'Factura Pagada' : 'Pendiente de Pago',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: _factura.isPagada ? Colors.green : Colors.orange,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceSummary() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'RESUMEN DEL SERVICIO',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _factura.conceptos.isNotEmpty
                ? _factura.conceptos.first.concepto
                : 'Emergencia Vehicular',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Factura N°', style: TextStyle(color: Colors.grey)),
              Text(_factura.numeroFactura),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Fecha', style: TextStyle(color: Colors.grey)),
              Text(_formatDate(_factura.creadoEn)),
            ],
          ),
          if (_factura.pagadoEn != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Fecha de Pago',
                    style: TextStyle(color: Colors.grey),
                  ),
                  Text(_formatDate(_factura.pagadoEn!)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBillingDetails() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          ..._factura.conceptos.map(
            (concepto) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD3E4FF),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.handyman, color: Color(0xFF005EA4)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      concepto.concepto,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                  Text(
                    '\$${concepto.subtotal.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          const Divider(),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Text(
                '\$${_factura.total.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF005EA4),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInformacionAdicional() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildInfoRow(
            'Comisión (10%)',
            '-\$${_factura.comisionPlataforma.toStringAsFixed(2)}',
          ),
          const Divider(),
          _buildInfoRow(
            'Neto taller',
            '\$${_factura.montoNetoTaller.toStringAsFixed(2)}',
            isBold: true,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              fontSize: isBold ? 16 : 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityNote() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock, size: 16, color: Colors.grey),
            const SizedBox(width: 6),
            const Text(
              'CIFRADO DE EXTREMO A EXTREMO',
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'Sus transacciones están protegidas con seguridad de grado bancario.',
          style: TextStyle(fontSize: 11, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildFloatingButton() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: ElevatedButton(
          onPressed: _pagando ? null : _iniciarPago,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF005EA4),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          child: _pagando
              ? const CircularProgressIndicator(color: Colors.white)
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Pagar Ahora \$${_factura.total.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward),
                  ],
                ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
