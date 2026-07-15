import "dart:convert";

import "package:flutter_secure_storage/flutter_secure_storage.dart";

import "../../models/user_session.dart";
import "../config/app_config.dart";

class SecureStorageService {
  SecureStorageService() : _storage = const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<void> saveSession(UserSession session) async {
    await _storage.write(
      key: AppConfig.sessionStorageKey,
      value: jsonEncode(session.toJson()),
    );
  }

  Future<UserSession?> readSession() async {
    final raw = await _storage.read(key: AppConfig.sessionStorageKey);
    if (raw == null || raw.isEmpty) return null;
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) return null;
    return UserSession.fromJson(decoded);
  }

  Future<void> savePin(String pin) async {
    await _storage.write(key: AppConfig.authPinKey, value: pin);
  }

  Future<String?> readPin() {
    return _storage.read(key: AppConfig.authPinKey);
  }

  Future<void> clear() async {
    await _storage.delete(key: AppConfig.sessionStorageKey);
    await _storage.delete(key: AppConfig.authPinKey);
  }
}
