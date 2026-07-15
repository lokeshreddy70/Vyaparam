import "dart:convert";

import "package:dio/dio.dart";

import "local_database.dart";

class SyncQueue {
  SyncQueue({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<void> enqueue({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
    Map<String, dynamic>? headers,
  }) async {
    final db = LocalDatabase.instance.db;
    await db.insert("mutation_queue", {
      "method": method,
      "endpoint": endpoint,
      "body": jsonEncode(body ?? const <String, dynamic>{}),
      "headers": jsonEncode(headers ?? const <String, dynamic>{}),
      "created_at": DateTime.now().toIso8601String(),
      "retry_count": 0,
    });
  }

  Future<void> processPending() async {
    final db = LocalDatabase.instance.db;
    final rows = await db.query("mutation_queue", orderBy: "id ASC", limit: 100);

    for (final row in rows) {
      final id = row["id"] as int;
      final method = (row["method"] ?? "POST") as String;
      final endpoint = (row["endpoint"] ?? "") as String;

      final bodyRaw = row["body"] as String?;
      final headersRaw = row["headers"] as String?;

      Map<String, dynamic> body = const {};
      Map<String, dynamic> headers = const {};

      try {
        if (bodyRaw != null && bodyRaw.isNotEmpty) {
          final parsed = jsonDecode(bodyRaw);
          if (parsed is Map<String, dynamic>) body = parsed;
        }
      } catch (_) {
        body = const {};
      }

      try {
        if (headersRaw != null && headersRaw.isNotEmpty) {
          final parsed = jsonDecode(headersRaw);
          if (parsed is Map<String, dynamic>) headers = parsed;
        }
      } catch (_) {
        headers = const {};
      }

      try {
        await _dio.request<dynamic>(
          endpoint,
          data: body,
          options: Options(method: method, headers: headers),
        );

        await db.delete("mutation_queue", where: "id = ?", whereArgs: [id]);
      } catch (_) {
        final retries = ((row["retry_count"] ?? 0) as int) + 1;
        await db.update(
          "mutation_queue",
          {"retry_count": retries},
          where: "id = ?",
          whereArgs: [id],
        );
      }
    }
  }
}
