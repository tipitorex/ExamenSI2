import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/vehiculo_model.dart';

class LocalVehicleDB {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDB();
    return _db!;
  }

  static Future<Database> _initDB() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'vehiculos_cache.db');
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE vehiculos (
            id INTEGER PRIMARY KEY,
            clienteId INTEGER NOT NULL,
            placa TEXT NOT NULL,
            marca TEXT NOT NULL,
            modelo TEXT NOT NULL,
            anio INTEGER,
            color TEXT
          )
        ''');
      },
    );
  }

  Future<void> insertAll(List<VehiculoModel> vehiculos) async {
    final db = await database;
    await db.delete('vehiculos');
    final batch = db.batch();
    for (final vehiculo in vehiculos) {
      batch.insert(
        'vehiculos',
        vehiculo.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<VehiculoModel>> getVehiculos() async {
    final db = await database;
    final maps = await db.query('vehiculos');
    return maps.map((m) => VehiculoModel.fromMap(m)).toList();
  }

  Future<void> clear() async {
    final db = await database;
    await db.delete('vehiculos');
  }
}
