import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'dart:math' as math;

class OSRMService {
  static const String baseUrl = 'https://router.project-osrm.org';

  /// Obtiene la ruta entre dos puntos
  /// Retorna una lista de coordenadas [lat, lng] y la distancia
  static Future<Map<String, dynamic>> getRoute(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) async {
    final url = Uri.parse(
      '$baseUrl/route/v1/driving/$startLng,$startLat;$endLng,$endLat?overview=full&geometries=geojson',
    );

    try {
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data['code'] == 'Ok' && data['routes'].isNotEmpty) {
          final route = data['routes'][0];
          final geometry = route['geometry']['coordinates'];

          // Convertir GeoJSON [lng, lat] a [lat, lng] para flutter_map
          final List<LatLng> points = [];
          for (var coord in geometry) {
            points.add(LatLng(coord[1], coord[0]));
          }

          final distance = route['distance'] / 1000; // Convertir a km
          final duration = route['duration'] / 60; // Convertir a minutos

          return {'points': points, 'distance': distance, 'duration': duration};
        }
      }

      // Fallback: línea recta si OSRM falla
      return _getStraightLine(startLat, startLng, endLat, endLng);
    } catch (e) {
      print('❌ Error OSRM: $e');
      return _getStraightLine(startLat, startLng, endLat, endLng);
    }
  }

  static Map<String, dynamic> _getStraightLine(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    final distance = _calcularDistancia(startLat, startLng, endLat, endLng);
    return {
      'points': [LatLng(startLat, startLng), LatLng(endLat, endLng)],
      'distance': distance,
      'duration': distance * 2, // 2 minutos por km
    };
  }

  static double _calcularDistancia(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const double R = 6371;
    final dLat = _toRadians(lat2 - lat1);
    final dLng = _toRadians(lng2 - lng1);
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat1)) *
            math.cos(_toRadians(lat2)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  static double _toRadians(double degrees) => degrees * math.pi / 180;
}
