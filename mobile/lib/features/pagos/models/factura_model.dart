class ConceptoFactura {
  final int id;
  final String concepto;
  final double cantidad;
  final double precioUnitario;
  final double subtotal;

  ConceptoFactura({
    required this.id,
    required this.concepto,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
  });

  factory ConceptoFactura.fromJson(Map<String, dynamic> json) {
    return ConceptoFactura(
      id: json['id'] ?? 0,
      concepto: json['concepto'] ?? '',
      cantidad: (json['cantidad'] ?? 0).toDouble(),
      precioUnitario: (json['precio_unitario'] ?? 0).toDouble(),
      subtotal: (json['subtotal'] ?? 0).toDouble(),
    );
  }
}

class Factura {
  final int id;
  final int incidenteId;
  final int tallerId;
  final int clienteId;
  final String numeroFactura;
  final double total;
  final double comisionPlataforma;
  final double montoNetoTaller;
  final String estado;
  final String? urlPago;
  final DateTime creadoEn;
  final DateTime? pagadoEn;
  final List<ConceptoFactura> conceptos;

  // ✅ NUEVOS CAMPOS - Datos del cliente y taller
  final String clienteNombre;
  final String clienteEmail;
  final String clienteTelefono;
  final String tallerNombre;

  Factura({
    required this.id,
    required this.incidenteId,
    required this.tallerId,
    required this.clienteId,
    required this.numeroFactura,
    required this.total,
    required this.comisionPlataforma,
    required this.montoNetoTaller,
    required this.estado,
    this.urlPago,
    required this.creadoEn,
    this.pagadoEn,
    required this.conceptos,
    // ✅ NUEVOS
    required this.clienteNombre,
    required this.clienteEmail,
    required this.clienteTelefono,
    required this.tallerNombre,
  });

  bool get isPagada => estado == 'pagada';
  bool get isPendiente => estado == 'pendiente';

  factory Factura.fromJson(Map<String, dynamic> json) {
    return Factura(
      id: json['id'] ?? 0,
      incidenteId: json['incidente_id'] ?? 0,
      tallerId: json['taller_id'] ?? 0,
      clienteId: json['cliente_id'] ?? 0,
      numeroFactura: json['numero_factura'] ?? '',
      total: (json['total'] ?? 0).toDouble(),
      comisionPlataforma: (json['comision_plataforma'] ?? 0).toDouble(),
      montoNetoTaller: (json['monto_neto_taller'] ?? 0).toDouble(),
      estado: json['estado'] ?? 'pendiente',
      urlPago: json['url_pago'],
      creadoEn: json['creado_en'] != null
          ? DateTime.parse(json['creado_en'])
          : DateTime.now(),
      pagadoEn: json['pagado_en'] != null
          ? DateTime.parse(json['pagado_en'])
          : null,
      conceptos:
          (json['conceptos'] as List?)
              ?.map((c) => ConceptoFactura.fromJson(c))
              .toList() ??
          [],
      // ✅ NUEVOS - Datos del cliente y taller desde las relaciones
      clienteNombre: json['cliente']?['nombre_completo'] ?? 'Cliente',
      clienteEmail: json['cliente']?['email'] ?? '',
      clienteTelefono: json['cliente']?['telefono'] ?? '',
      tallerNombre: json['taller']?['nombre'] ?? 'Taller',
    );
  }
}
