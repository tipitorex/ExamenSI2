import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class IncidentePendiente {
  final int? id;
  final String localUuid;
  final Map<String, dynamic> datos;
  final String estado; // pendiente_sync | sincronizado | error
  final DateTime creadoEn;
  final int? incidenteIdRemoto;
  final int reintentos;
  final String? errorMensaje;

  const IncidentePendiente({
    this.id,
    required this.localUuid,
    required this.datos,
    required this.estado,
    required this.creadoEn,
    this.incidenteIdRemoto,
    this.reintentos = 0,
    this.errorMensaje,
  });

  factory IncidentePendiente.fromMap(Map<String, dynamic> m) {
    return IncidentePendiente(
      id: m['id'] as int?,
      localUuid: m['local_uuid'] as String,
      datos: jsonDecode(m['datos_json'] as String) as Map<String, dynamic>,
      estado: m['estado'] as String,
      creadoEn: DateTime.parse(m['creado_en'] as String),
      incidenteIdRemoto: m['incidente_id_remoto'] as int?,
      reintentos: (m['reintentos'] as int?) ?? 0,
      errorMensaje: m['error_mensaje'] as String?,
    );
  }

  Map<String, dynamic> toMap() => {
        'local_uuid': localUuid,
        'datos_json': jsonEncode(datos),
        'estado': estado,
        'creado_en': creadoEn.toIso8601String(),
        'incidente_id_remoto': incidenteIdRemoto,
        'reintentos': reintentos,
        'error_mensaje': errorMensaje,
      };
}

class LocalDbService {
  LocalDbService._();
  static final LocalDbService instance = LocalDbService._();

  Database? _db;

  Future<Database> get db async {
    _db ??= await _inicializar();
    return _db!;
  }

  Future<Database> _inicializar() async {
    final path = join(await getDatabasesPath(), 'ceroespera_offline.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE incidentes_pendientes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            local_uuid      TEXT    UNIQUE NOT NULL,
            datos_json      TEXT    NOT NULL,
            estado          TEXT    NOT NULL DEFAULT 'pendiente_sync',
            creado_en       TEXT    NOT NULL,
            incidente_id_remoto INTEGER,
            reintentos      INTEGER NOT NULL DEFAULT 0,
            error_mensaje   TEXT
          )
        ''');
      },
    );
  }

  Future<void> guardarPendiente(String localUuid, Map<String, dynamic> datos) async {
    final database = await db;
    await database.insert(
      'incidentes_pendientes',
      IncidentePendiente(
        localUuid: localUuid,
        datos: datos,
        estado: 'pendiente_sync',
        creadoEn: DateTime.now(),
      ).toMap(),
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
  }

  Future<List<IncidentePendiente>> obtenerPendientes() async {
    final database = await db;
    final rows = await database.query(
      'incidentes_pendientes',
      where: 'estado = ?',
      whereArgs: ['pendiente_sync'],
      orderBy: 'creado_en ASC',
    );
    return rows.map(IncidentePendiente.fromMap).toList();
  }

  Future<List<IncidentePendiente>> obtenerTodos() async {
    final database = await db;
    final rows = await database.query(
      'incidentes_pendientes',
      orderBy: 'creado_en DESC',
    );
    return rows.map(IncidentePendiente.fromMap).toList();
  }

  Future<int> contarPendientes() async {
    final database = await db;
    final result = await database.rawQuery(
      "SELECT COUNT(*) as c FROM incidentes_pendientes WHERE estado = 'pendiente_sync'",
    );
    return (result.first['c'] as int?) ?? 0;
  }

  // Cuenta pendientes + errores (no sincronizados aún)
  Future<int> contarPendientesSinEnviar() async {
    final database = await db;
    final result = await database.rawQuery(
      "SELECT COUNT(*) as c FROM incidentes_pendientes WHERE estado IN ('pendiente_sync', 'error')",
    );
    return (result.first['c'] as int?) ?? 0;
  }

  Future<void> marcarSincronizado(String localUuid, int incidenteIdRemoto) async {
    final database = await db;
    await database.update(
      'incidentes_pendientes',
      {
        'estado': 'sincronizado',
        'incidente_id_remoto': incidenteIdRemoto,
        'error_mensaje': null,
      },
      where: 'local_uuid = ?',
      whereArgs: [localUuid],
    );
  }

  Future<void> marcarError(String localUuid, String mensaje) async {
    final database = await db;
    await database.rawUpdate(
      '''UPDATE incidentes_pendientes
         SET estado = 'error', error_mensaje = ?, reintentos = reintentos + 1
         WHERE local_uuid = ?''',
      [mensaje, localUuid],
    );
  }

  Future<void> reintentarErrores() async {
    final database = await db;
    await database.update(
      'incidentes_pendientes',
      {'estado': 'pendiente_sync'},
      where: 'estado = ? AND reintentos < 5',
      whereArgs: ['error'],
    );
  }

  Future<void> eliminarSincronizados() async {
    final database = await db;
    await database.delete(
      'incidentes_pendientes',
      where: 'estado = ?',
      whereArgs: ['sincronizado'],
    );
  }
}
