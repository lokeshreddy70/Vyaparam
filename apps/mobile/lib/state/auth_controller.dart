import "package:flutter/foundation.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../core/services/auth_repository.dart";
import "../core/services/biometric_service.dart";
import "../core/services/secure_storage_service.dart";
import "../models/user_session.dart";
import "providers.dart";

@immutable
class AuthViewState {
  const AuthViewState({
    this.session,
    this.loading = false,
    this.initializing = true,
    this.locked = false,
    this.error,
  });

  final UserSession? session;
  final bool loading;
  final bool initializing;
  final bool locked;
  final String? error;

  AuthViewState copyWith({
    UserSession? session,
    bool? loading,
    bool? initializing,
    bool? locked,
    String? error,
  }) {
    return AuthViewState(
      session: session ?? this.session,
      loading: loading ?? this.loading,
      initializing: initializing ?? this.initializing,
      locked: locked ?? this.locked,
      error: error,
    );
  }
}

class AuthController extends StateNotifier<AuthViewState> {
  AuthController({
    required AuthRepository authRepository,
    required SecureStorageService secureStorage,
    required BiometricService biometricService,
    required SessionMemory memory,
  })  : _authRepository = authRepository,
        _secureStorage = secureStorage,
        _biometricService = biometricService,
        _memory = memory,
        super(const AuthViewState()) {
    initialize();
  }

  final AuthRepository _authRepository;
  final SecureStorageService _secureStorage;
  final BiometricService _biometricService;
  final SessionMemory _memory;

  Future<void> initialize() async {
    final restored = await _authRepository.restoreSession();
    if (restored == null) {
      state = const AuthViewState(initializing: false, session: null);
      return;
    }

    _memory.current = restored;
    final shouldLock = restored.pinEnabled || restored.biometricEnabled;
    state = AuthViewState(initializing: false, session: restored, locked: shouldLock);
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final session = await _authRepository.login(email: email, password: password);
      _memory.current = session;
      state = AuthViewState(initializing: false, session: session, loading: false, locked: false);
      return true;
    } catch (error) {
      state = state.copyWith(loading: false, error: "$error");
      return false;
    }
  }

  Future<void> logout() async {
    await _authRepository.logout();
    _memory.current = null;
    state = const AuthViewState(initializing: false, session: null);
  }

  Future<void> setPin(String pin) async {
    final session = state.session;
    if (session == null) return;
    await _secureStorage.savePin(pin);
    final updated = session.copyWith(pinEnabled: true);
    await _secureStorage.saveSession(updated);
    _memory.current = updated;
    state = state.copyWith(session: updated);
  }

  Future<bool> unlockWithPin(String pin) async {
    final saved = await _secureStorage.readPin();
    if (saved == null || saved != pin) return false;
    state = state.copyWith(locked: false);
    return true;
  }

  Future<bool> unlockWithBiometric() async {
    final ok = await _biometricService.authenticate();
    if (ok) {
      state = state.copyWith(locked: false);
    }
    return ok;
  }

  Future<void> setBiometric(bool enabled) async {
    final session = state.session;
    if (session == null) return;
    final updated = session.copyWith(biometricEnabled: enabled);
    await _secureStorage.saveSession(updated);
    _memory.current = updated;
    state = state.copyWith(session: updated);
  }

  void lock() {
    if (state.session == null) return;
    state = state.copyWith(locked: true);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthViewState>((ref) {
  return AuthController(
    authRepository: ref.watch(authRepositoryProvider),
    secureStorage: ref.watch(secureStorageProvider),
    biometricService: ref.watch(biometricServiceProvider),
    memory: ref.watch(sessionMemoryProvider),
  );
});
