import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';

class CotizacionModel {
  final int id;
  final int incidenteId;
  final int tallerId;
  final double montoTotal;
  final int tiempoEstimadoReparacionMinutos;
  final String? detallesServicio;
  final String? notas;
  final String estado;
  final String creadoEn;
  final Map<String, dynamic>? taller;
  final List<Map<String, dynamic>> items;

  const CotizacionModel({
    required this.id,
    required this.incidenteId,
    required this.tallerId,
    required this.montoTotal,
    required this.tiempoEstimadoReparacionMinutos,
    this.detallesServicio,
    this.notas,
    required this.estado,
    required this.creadoEn,
    this.taller,
    this.items = const [],
  });

  factory CotizacionModel.fromJson(Map<String, dynamic> json) {
    return CotizacionModel(
      id: json['id'] as int,
      incidenteId: json['incidente_id'] as int,
      tallerId: json['taller_id'] as int,
      montoTotal: (json['monto_total'] as num).toDouble(),
      tiempoEstimadoReparacionMinutos: json['tiempo_estimado_reparacion_minutos'] as int,
      detallesServicio: json['detalles_servicio'] as String?,
      notas: json['notas'] as String?,
      estado: json['estado'] as String,
      creadoEn: json['creado_en'] as String,
      taller: json['taller'] as Map<String, dynamic>?,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => e as Map<String, dynamic>)
              .toList() ??
          [],
    );
  }

  String get tallerNombre => taller?['nombre'] as String? ?? 'Taller #$tallerId';
  String? get tallerTelefono => taller?['telefono'] as String?;
  double? get tallerLatitud => (taller?['latitud'] as num?)?.toDouble();
  double? get tallerLongitud => (taller?['longitud'] as num?)?.toDouble();

  String get tiempoFormateado {
    if (tiempoEstimadoReparacionMinutos < 60) {
      return '$tiempoEstimadoReparacionMinutos min';
    }
    final h = tiempoEstimadoReparacionMinutos ~/ 60;
    final m = tiempoEstimadoReparacionMinutos % 60;
    return m > 0 ? '${h}h ${m}min' : '${h}h';
  }
}

class CotizacionApiService {
  CotizacionApiService._();
  static final CotizacionApiService instance = CotizacionApiService._();

  final http.Client _client = http.Client();

  /// Obtiene las cotizaciones pendientes para un incidente del cliente.
  Future<List<CotizacionModel>> getCotizacionesIncidente(int incidenteId) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/cotizaciones/incidente/$incidenteId');

    final response = await _client.get(uri, headers: headers);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((j) => CotizacionModel.fromJson(j as Map<String, dynamic>)).toList();
    } else if (response.statusCode == 401) {
      throw AuthApiException('Sesión expirada.');
    } else {
      throw AuthApiException('Error al cargar cotizaciones.');
    }
  }

  /// Cliente acepta una cotización.
  Future<Map<String, dynamic>> aceptarCotizacion(int cotizacionId) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/cotizaciones/$cotizacionId/aceptar');

    final response = await _client.post(uri, headers: headers);

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else if (response.statusCode == 401) {
      throw AuthApiException('Sesión expirada.');
    } else {
      final body = jsonDecode(response.body);
      final detail = body['detail'] ?? 'Error al aceptar la cotización';
      throw AuthApiException(detail.toString());
    }
  }
}
