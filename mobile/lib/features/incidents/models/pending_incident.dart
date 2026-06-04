class PendingIncident {
  final String localId;
  final String syncId;         // mismo UUID que se enviará al backend
  final int vehiculoId;
  final double latitud;
  final double longitud;
  final String? descripcion;
  final String prioridad;
  // Para evidencias guardadas localmente
  final String? imagenFrontalPath;
  final List<String> imagenesAdicionalesPaths;
  final String? audioPath;
  final String? transcripcionAudio; // si se transcribió antes
  final String status;
  final DateTime createdAt;
  final DateTime? lastSyncAttempt;
  final String? errorMessage;

  PendingIncident({
    required this.localId,
    required this.syncId,
    required this.vehiculoId,
    required this.latitud,
    required this.longitud,
    this.descripcion,
    required this.prioridad,
    this.imagenFrontalPath,
    this.imagenesAdicionalesPaths = const [],
    this.audioPath,
    this.transcripcionAudio,
    this.status = 'pendiente',
    required this.createdAt,
    this.lastSyncAttempt,
    this.errorMessage,
  });

  Map<String, dynamic> toMap() => {
    'localId': localId,
    'syncId': syncId,
    'vehiculoId': vehiculoId,
    'latitud': latitud,
    'longitud': longitud,
    'descripcion': descripcion,
    'prioridad': prioridad,
    'imagenFrontalPath': imagenFrontalPath,
    'imagenesAdicionalesPaths': imagenesAdicionalesPaths.join(','),
    'audioPath': audioPath,
    'transcripcionAudio': transcripcionAudio,
    'status': status,
    'createdAt': createdAt.toIso8601String(),
    'lastSyncAttempt': lastSyncAttempt?.toIso8601String(),
    'errorMessage': errorMessage,
  };

  factory PendingIncident.fromMap(Map<String, dynamic> map) => PendingIncident(
    localId: map['localId'],
    syncId: map['syncId'],
    vehiculoId: map['vehiculoId'],
    latitud: map['latitud'],
    longitud: map['longitud'],
    descripcion: map['descripcion'],
    prioridad: map['prioridad'] ?? 'media',
    imagenFrontalPath: map['imagenFrontalPath'],
    imagenesAdicionalesPaths: (map['imagenesAdicionalesPaths'] as String?)?.split(',').where((s) => s.isNotEmpty).toList() ?? [],
    audioPath: map['audioPath'],
    transcripcionAudio: map['transcripcionAudio'],
    status: map['status'] ?? 'pendiente',
    createdAt: DateTime.parse(map['createdAt']),
    lastSyncAttempt: map['lastSyncAttempt'] != null ? DateTime.parse(map['lastSyncAttempt']) : null,
    errorMessage: map['errorMessage'],
  );
}