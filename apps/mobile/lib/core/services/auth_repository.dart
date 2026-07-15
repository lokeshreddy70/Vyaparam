import "package:dio/dio.dart";

import "../../models/user_session.dart";
import "api_client.dart";
import "secure_storage_service.dart";

class AuthRepository {
  AuthRepository({required ApiClient apiClient, required SecureStorageService secureStorage})
      : _api = apiClient,
        _secureStorage = secureStorage;

  final ApiClient _api;
  final SecureStorageService _secureStorage;

  Future<UserSession> login({required String email, required String password}) async {
    final response = await _api.dio.post<dynamic>(
      "/auth/login",
      data: {"email": email, "password": password},
    );

    final payload = _extractMap(response.data);
    final userMap = _extractMap(payload["user"]);

    final session = UserSession(
      userId: (userMap["id"] ?? "") as String,
      name: (userMap["name"] ?? "") as String,
      email: (userMap["email"] ?? email) as String,
      role: (userMap["role"] ?? "EMPLOYEE") as String,
      businessId: userMap["businessId"] as String?,
      branchId: userMap["branchId"] as String?,
      accessToken: (payload["accessToken"] ?? "") as String,
      refreshToken: (payload["refreshToken"] ?? "") as String,
      permissions: const [],
    );

    final permissions = await fetchPermissions(session.accessToken);
    final enriched = session.copyWith(permissions: permissions);
    await _secureStorage.saveSession(enriched);
    return enriched;
  }

  Future<void> logout() {
    return _secureStorage.clear();
  }

  Future<List<String>> fetchPermissions(String accessToken) async {
    try {
      final response = await _api.dio.get<dynamic>(
        "/users/profile",
        options: Options(headers: {"Authorization": "Bearer $accessToken"}),
      );
      final payload = _extractMap(response.data);
      final permissions = payload["permissions"];
      if (permissions is List) return permissions.map((e) => "$e").toList();
      return const [];
    } catch (_) {
      return const [];
    }
  }

  Future<UserSession?> restoreSession() {
    return _secureStorage.readSession();
  }

  Map<String, dynamic> _extractMap(dynamic source) {
    if (source is Map<String, dynamic>) {
      final nested = source["data"];
      if (nested is Map<String, dynamic>) return nested;
      return source;
    }
    return <String, dynamic>{};
  }
}
