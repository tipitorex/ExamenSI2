import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../core/config/api_config.dart';
import '../../auth/services/auth_api_service.dart';

// ────────────────────────────────────────────
// MODELS
// ────────────────────────────────────────────

class TallerCercano {
  final int id;
  final String nombre;
  final String? telefono;
  final String? direccion;
  final double latitud;
  final double longitud;
  final double distanciaKm;
  final List<ServicioCatalogo> servicios;

  const TallerCercano({
    required this.id,
    required this.nombre,
    this.telefono,
    this.direccion,
    required this.latitud,
    required this.longitud,
    required this.distanciaKm,
    required this.servicios,
  });

  factory TallerCercano.fromJson(Map<String, dynamic> j) => TallerCercano(
        id: j['id'],
        nombre: j['nombre'],
        telefono: j['telefono'],
        direccion: j['direccion'],
        latitud: (j['latitud'] as num).toDouble(),
        longitud: (j['longitud'] as num).toDouble(),
        distanciaKm: (j['distancia_km'] as num).toDouble(),
        servicios: (j['servicios'] as List<dynamic>? ?? [])
            .map((s) => ServicioCatalogo.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}

class ServicioCatalogo {
  final int id;
  final String nombre;
  final String? descripcion;
  final double? precioBase;
  final int? tiempoEstimadoMinutos;

  const ServicioCatalogo({
    required this.id,
    required this.nombre,
    this.descripcion,
    this.precioBase,
    this.tiempoEstimadoMinutos,
  });

  factory ServicioCatalogo.fromJson(Map<String, dynamic> j) => ServicioCatalogo(
        id: j['id'],
        nombre: j['nombre'],
        descripcion: j['descripcion'],
        precioBase: j['precio_base'] != null ? (j['precio_base'] as num).toDouble() : null,
        tiempoEstimadoMinutos: j['tiempo_estimado_minutos'],
      );
}

class ItemRespuestaCV {
  final String nombre;
  final double precio;
  const ItemRespuestaCV({required this.nombre, required this.precio});
  factory ItemRespuestaCV.fromJson(Map<String, dynamic> j) =>
      ItemRespuestaCV(nombre: j['nombre'], precio: (j['precio'] as num).toDouble());
}

class CotizacionVehiculoModel {
  final int id;
  final int tallerId;
  final String descripcion;
  final String? imagenUrl;
  final String estado;
  final List<ItemRespuestaCV> respuestaItems;
  final double? respuestaMonto;
  final String? respuestaDescripcion;
  final double? respuestaTiempoHoras;
  final DateTime creadoEn;
  final DateTime? respondidoEn;
  final Map<String, dynamic>? taller;

  const CotizacionVehiculoModel({
    required this.id,
    required this.tallerId,
    required this.descripcion,
    this.imagenUrl,
    required this.estado,
    required this.respuestaItems,
    this.respuestaMonto,
    this.respuestaDescripcion,
    this.respuestaTiempoHoras,
    required this.creadoEn,
    this.respondidoEn,
    this.taller,
  });

  factory CotizacionVehiculoModel.fromJson(Map<String, dynamic> j) {
    List<ItemRespuestaCV> items = [];
    final raw = j['respuesta_items'];
    if (raw is List) {
      items = raw.map((e) => ItemRespuestaCV.fromJson(e as Map<String, dynamic>)).toList();
    }
    return CotizacionVehiculoModel(
      id: j['id'],
      tallerId: j['taller_id'],
      descripcion: j['descripcion'],
      imagenUrl: j['imagen_url'],
      estado: j['estado'],
      respuestaItems: items,
      respuestaMonto: j['respuesta_monto'] != null ? (j['respuesta_monto'] as num).toDouble() : null,
      respuestaDescripcion: j['respuesta_descripcion'],
      respuestaTiempoHoras: j['respuesta_tiempo_horas'] != null
          ? (j['respuesta_tiempo_horas'] as num).toDouble()
          : null,
      creadoEn: DateTime.parse(j['creado_en']),
      respondidoEn: j['respondido_en'] != null ? DateTime.parse(j['respondido_en']) : null,
      taller: j['taller'] as Map<String, dynamic>?,
    );
  }
}

// ────────────────────────────────────────────
// SERVICE
// ────────────────────────────────────────────

class CotizacionVehiculoService {
  CotizacionVehiculoService._();

  static Future<Map<String, String>> _headers() async {
    return await AuthApiService.instance.obtenerHeadersAutorizados();
  }

  static Future<List<TallerCercano>> getTalleresCercanos({
    required double lat,
    required double lng,
    double radioKm = 10.0,
  }) async {
    final headers = await _headers();
    final uri = Uri.parse(
        '${ApiConfig.baseUrl}/talleres/cercanos?lat=$lat&lng=$lng&radio_km=$radioKm');
    final res = await http.get(uri, headers: headers);
    if (res.statusCode != 200) throw Exception('Error al obtener talleres cercanos');
    final data = jsonDecode(res.body) as List<dynamic>;
    return data.map((e) => TallerCercano.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<CotizacionVehiculoModel> crearSolicitud({
    required int tallerId,
    required String descripcion,
    File? imagen,
  }) async {
    final headers = await AuthApiService.instance.obtenerHeadersAutorizados();
    final uri = Uri.parse('${ApiConfig.baseUrl}/cotizaciones-vehiculo');
    final req = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = headers['Authorization'] ?? ''
      ..fields['taller_id'] = tallerId.toString()
      ..fields['descripcion'] = descripcion;
    if (imagen != null) {
      req.files.add(await http.MultipartFile.fromPath('imagen', imagen.path));
    }
    final streamed = await req.send();
    final body = await streamed.stream.bytesToString();
    if (streamed.statusCode != 200 && streamed.statusCode != 201) {
      throw Exception('Error al crear solicitud: $body');
    }
    return CotizacionVehiculoModel.fromJson(jsonDecode(body) as Map<String, dynamic>);
  }

  static Future<List<CotizacionVehiculoModel>> getMisSolicitudes() async {
    final headers = await _headers();
    final uri = Uri.parse('${ApiConfig.baseUrl}/cotizaciones-vehiculo/mis-solicitudes');
    final res = await http.get(uri, headers: headers);
    if (res.statusCode != 200) throw Exception('Error al obtener solicitudes');
    final data = jsonDecode(res.body) as List<dynamic>;
    return data.map((e) => CotizacionVehiculoModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> cerrarSolicitud(int id) async {
    final headers = await _headers();
    final uri = Uri.parse('${ApiConfig.baseUrl}/cotizaciones-vehiculo/$id/cerrar');
    await http.post(uri, headers: headers);
  }
}
