class VehiculoModel {
  VehiculoModel({
    required this.id,
    required this.clienteId,
    required this.placa,
    required this.marca,
    required this.modelo,
    required this.anio,
    required this.color,
  });

  final int id;
  final int clienteId;
  final String placa;
  final String marca;
  final String modelo;
  final int? anio;
  final String? color;

  String get nombreCorto => '$marca $modelo ($placa)';

  factory VehiculoModel.fromJson(Map<String, dynamic> json) {
    return VehiculoModel(
      id: json['id'] as int,
      clienteId: json['cliente_id'] as int,
      placa: json['placa'] as String,
      marca: json['marca'] as String,
      modelo: json['modelo'] as String,
      anio: json['anio'] as int?,
      color: json['color'] as String?,
    );
  }
}
