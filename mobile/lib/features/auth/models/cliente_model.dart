class ClienteModel {
  const ClienteModel({
    required this.id,
    required this.nombreCompleto,
    required this.email,
    this.telefono,
    required this.rol,
    required this.activo,
    required this.creadoEn,
  });

  final int id;
  final String nombreCompleto;
  final String email;
  final String? telefono;
  final String rol;
  final bool activo;
  final DateTime creadoEn;

  factory ClienteModel.fromJson(Map<String, dynamic> json) {
    return ClienteModel(
      id: json['id'] as int,
      nombreCompleto: json['nombre_completo'] as String,
      email: json['email'] as String,
      telefono: json['telefono'] as String?,
      rol: json['rol'] as String,
      activo: json['activo'] as bool,
      creadoEn: DateTime.parse(json['creado_en'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nombre_completo': nombreCompleto,
      'email': email,
      'telefono': telefono,
      'rol': rol,
      'activo': activo,
      'creado_en': creadoEn.toIso8601String(),
    };
  }
}
