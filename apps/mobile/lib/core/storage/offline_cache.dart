import "dart:convert";

import "package:hive/hive.dart";

class OfflineCache {
  OfflineCache._();

  static final OfflineCache instance = OfflineCache._();
  static const String _boxName = "api_cache";

  Box<dynamic>? _box;

  Future<void> initialize() async {
    _box ??= await Hive.openBox<dynamic>(_boxName);
  }

  Future<void> cacheGetResponse({
    required String endpoint,
    required Map<String, dynamic>? query,
    required dynamic data,
  }) async {
    await initialize();
    final key = _buildKey(endpoint, query);
    await _box!.put(key, jsonEncode(data));
  }

  Future<dynamic> getCachedResponse(String endpoint, Map<String, dynamic>? query) async {
    await initialize();
    final key = _buildKey(endpoint, query);
    final raw = _box!.get(key);
    if (raw is! String) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return null;
    }
  }

  String _buildKey(String endpoint, Map<String, dynamic>? query) {
    if (query == null || query.isEmpty) return endpoint;
    final entries = query.entries.toList()..sort((a, b) => a.key.compareTo(b.key));
    return "$endpoint?${entries.map((e) => "${e.key}=${e.value}").join("&")}";
  }
}
