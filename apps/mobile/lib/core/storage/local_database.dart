import "package:path/path.dart";
import "package:path_provider/path_provider.dart";
import "package:sqflite/sqflite.dart";

class LocalDatabase {
  LocalDatabase._();

  static final LocalDatabase instance = LocalDatabase._();

  Database? _db;

  Future<void> initialize() async {
    _db ??= await _open();
  }

  Future<Database> _open() async {
    final dir = await getApplicationDocumentsDirectory();
    final path = join(dir.path, "smartbiz_mobile.db");
    return openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute("""
          CREATE TABLE mutation_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            method TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            body TEXT,
            headers TEXT,
            created_at TEXT NOT NULL,
            retry_count INTEGER NOT NULL DEFAULT 0
          )
        """);

        await db.execute("""
          CREATE TABLE notification_history (
            id TEXT PRIMARY KEY,
            title TEXT,
            body TEXT,
            payload TEXT,
            created_at TEXT NOT NULL
          )
        """);
      },
    );
  }

  Database get db {
    final current = _db;
    if (current == null) {
      throw StateError("LocalDatabase.initialize must be called before usage");
    }
    return current;
  }
}
