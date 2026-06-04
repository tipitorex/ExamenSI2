import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/pending_incident.dart';

class LocalIncidentDB {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDB();
    return _db!;
  }

  static Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'offline_incidents.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE pending_incidents (
            localId TEXT PRIMARY KEY,
            syncId TEXT UNIQUE,
            vehiculoId INTEGER NOT NULL,
            latitud REAL NOT NULL,
            longitud REAL NOT NULL,
            descripcion TEXT,
            prioridad TEXT NOT NULL DEFAULT 'media',
            imagenFrontalPath TEXT,
            imagenesAdicionalesPaths TEXT,
            audioPath TEXT,
            transcripcionAudio TEXT,
            status TEXT NOT NULL DEFAULT 'pendiente',
            createdAt TEXT NOT NULL,
            lastSyncAttempt TEXT,
            errorMessage TEXT
          )
        ''');
      },
    );
  }

  Future<void> insert(PendingIncident incident) async {
    final db = await database;
    await db.insert('pending_incidents', incident.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<PendingIncident>> getPendientes() async {
    final db = await database;
    final maps = await db.query('pending_incidents',
        where: 'status = ?', whereArgs: ['pendiente']);
    return maps.map((m) => PendingIncident.fromMap(m)).toList();
  }

  Future<void> updateStatus(String localId, String status,
    {String? errorMessage}) async {
  final db = await database;
  await db.update(
    'pending_incidents',
    {
      'status': status,
      'lastSyncAttempt': DateTime.now().toIso8601String(),
      'errorMessage': errorMessage, // ← ahora siempre se actualiza (puede ser null)
    },
    where: 'localId = ?',
    whereArgs: [localId],
  );
}

  Future<void> delete(String localId) async {
    final db = await database;
    await db.delete('pending_incidents',
        where: 'localId = ?', whereArgs: [localId]);
  }
}