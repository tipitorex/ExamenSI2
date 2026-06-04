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

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'clienteId': clienteId,
      'placa': placa,
      'marca': marca,
      'modelo': modelo,
      'anio': anio,
      'color': color,
    };
  }

  factory VehiculoModel.fromMap(Map<String, dynamic> map) {
    return VehiculoModel(
      id: map['id'] as int,
      clienteId: map['clienteId'] as int,
      placa: map['placa'] as String,
      marca: map['marca'] as String,
      modelo: map['modelo'] as String,
      anio: map['anio'] as int?,
      color: map['color'] as String?,
    );
  }

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
