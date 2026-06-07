class TecnicoModel {
  final int id;
  final int tallerId;
  final String nombreCompleto;
  final String? telefono;
  final String? especialidad;
  final bool disponible;
  final bool activo;
  final String? email;

  TecnicoModel({
    required this.id,
    required this.tallerId,
    required this.nombreCompleto,
    this.telefono,
    this.especialidad,
    required this.disponible,
    required this.activo,
    this.email,
  });

  factory TecnicoModel.fromJson(Map<String, dynamic> json) {
    return TecnicoModel(
      id: json['id'],
      tallerId: json['taller_id'],
      nombreCompleto: json['nombre_completo'],
      telefono: json['telefono'],
      especialidad: json['especialidad'],
      disponible: json['disponible'] ?? true,
      activo: json['activo'] ?? true,
      email: json['email'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taller_id': tallerId,
      'nombre_completo': nombreCompleto,
      'telefono': telefono,
      'especialidad': especialidad,
      'disponible': disponible,
      'activo': activo,
      'email': email,
    };
  }
}
