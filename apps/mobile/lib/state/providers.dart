import "package:flutter_riverpod/flutter_riverpod.dart";

import "../core/services/api_client.dart";
import "../core/services/auth_repository.dart";
import "../core/services/biometric_service.dart";
import "../core/services/notification_service.dart";
import "../core/services/secure_storage_service.dart";
import "../models/user_session.dart";

class SessionMemory {
  UserSession? current;
}

final baseUrlProvider = Provider<String>((ref) {
  return const String.fromEnvironment("API_BASE_URL", defaultValue: "http://localhost:3000");
});

final sessionMemoryProvider = Provider<SessionMemory>((ref) => SessionMemory());

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final baseUrl = ref.watch(baseUrlProvider);
  final memory = ref.watch(sessionMemoryProvider);
  final secureStorage = ref.watch(secureStorageProvider);

  return ApiClient(
    baseUrl: baseUrl,
    readSession: () => memory.current,
    writeSession: (session) async {
      memory.current = session;
      await secureStorage.saveSession(session);
    },
    clearSession: () async {
      memory.current = null;
      await secureStorage.clear();
    },
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    apiClient: ref.watch(apiClientProvider),
    secureStorage: ref.watch(secureStorageProvider),
  );
});

final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService();
});
