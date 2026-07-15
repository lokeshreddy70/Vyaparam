import "dart:async";

import "package:dio/dio.dart";

import "../../models/user_session.dart";
import "../config/app_config.dart";
import "../storage/offline_cache.dart";
import "../storage/sync_queue.dart";

typedef SessionReader = UserSession? Function();
typedef SessionWriter = Future<void> Function(UserSession session);
typedef SessionClearer = Future<void> Function();

class ApiClient {
  ApiClient({
    required String baseUrl,
    required SessionReader readSession,
    required SessionWriter writeSession,
    required SessionClearer clearSession,
  })  : _readSession = readSession,
        _writeSession = writeSession,
        _clearSession = clearSession,
        dio = Dio(
          BaseOptions(
            baseUrl: "$baseUrl${AppConfig.apiBasePath}",
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 20),
          ),
        ) {
    _syncQueue = SyncQueue(dio: dio);
    _configureInterceptors();
  }

  final Dio dio;
  final SessionReader _readSession;
  final SessionWriter _writeSession;
  final SessionClearer _clearSession;
  late final SyncQueue _syncQueue;

  Completer<String?>? _refreshInFlight;

  Future<void> _configureInterceptors() async {
    await OfflineCache.instance.initialize();

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final session = _readSession();
          final token = session?.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers["Authorization"] = "Bearer $token";
          }
          handler.next(options);
        },
        onResponse: (response, handler) async {
          final method = response.requestOptions.method.toUpperCase();
          if (method == "GET") {
            await OfflineCache.instance.cacheGetResponse(
              endpoint: response.requestOptions.path,
              query: response.requestOptions.queryParameters,
              data: response.data,
            );
          }
          handler.next(response);
        },
        onError: (error, handler) async {
          if (_shouldRefresh(error)) {
            final newToken = await _refreshToken();
            if (newToken != null && newToken.isNotEmpty) {
              final cloned = await _retryRequest(error.requestOptions, newToken);
              handler.resolve(cloned);
              return;
            }
          }

          final method = error.requestOptions.method.toUpperCase();
          final path = error.requestOptions.path;

          if (method == "GET") {
            final cached = await OfflineCache.instance.getCachedResponse(
              path,
              error.requestOptions.queryParameters,
            );
            if (cached != null) {
              handler.resolve(
                Response(
                  requestOptions: error.requestOptions,
                  data: cached,
                  statusCode: 200,
                ),
              );
              return;
            }
          }

          if (method != "GET" && _isQueueable(path)) {
            await _syncQueue.enqueue(
              method: method,
              endpoint: path,
              body: _mapBody(error.requestOptions.data),
              headers: _mapBody(error.requestOptions.headers),
            );
            handler.resolve(
              Response(
                requestOptions: error.requestOptions,
                data: {"queued": true, "endpoint": path},
                statusCode: 202,
              ),
            );
            return;
          }

          handler.next(error);
        },
      ),
    );
  }

  Future<void> processBackgroundSync() {
    return _syncQueue.processPending();
  }

  bool _shouldRefresh(DioException error) {
    final code = error.response?.statusCode;
    final endpoint = error.requestOptions.path;
    return code == 401 && endpoint != "/auth/refresh";
  }

  bool _isQueueable(String endpoint) {
    return endpoint.startsWith("/billing-pos") ||
        endpoint.startsWith("/orders") ||
        endpoint.startsWith("/invoices") ||
        endpoint.startsWith("/settings/business-configuration");
  }

  Future<String?> _refreshToken() async {
    if (_refreshInFlight != null) return _refreshInFlight!.future;

    _refreshInFlight = Completer<String?>();
    try {
      final session = _readSession();
      final refresh = session?.refreshToken;
      if (refresh == null || refresh.isEmpty) {
        await _clearSession();
        _refreshInFlight!.complete(null);
        return _refreshInFlight!.future;
      }

      final response = await dio.post<dynamic>(
        "/auth/refresh",
        options: Options(headers: {"Authorization": "Bearer $refresh"}),
      );

      final payload = _extractPayload(response.data);
      final accessToken = (payload["accessToken"] ?? "") as String;
      final refreshToken = (payload["refreshToken"] ?? refresh) as String;

      if (accessToken.isEmpty) {
        await _clearSession();
        _refreshInFlight!.complete(null);
        return _refreshInFlight!.future;
      }

      final updated = session!.copyWith(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await _writeSession(updated);
      _refreshInFlight!.complete(accessToken);
      return _refreshInFlight!.future;
    } catch (_) {
      await _clearSession();
      _refreshInFlight!.complete(null);
      return _refreshInFlight!.future;
    } finally {
      _refreshInFlight = null;
    }
  }

  Future<Response<dynamic>> _retryRequest(
    RequestOptions request,
    String token,
  ) {
    final options = Options(
      method: request.method,
      headers: {...request.headers, "Authorization": "Bearer $token"},
    );

    return dio.request<dynamic>(
      request.path,
      data: request.data,
      queryParameters: request.queryParameters,
      options: options,
    );
  }

  Map<String, dynamic> _extractPayload(dynamic data) {
    if (data is Map<String, dynamic>) {
      final nested = data["data"];
      if (nested is Map<String, dynamic>) return nested;
      return data;
    }
    return <String, dynamic>{};
  }

  Map<String, dynamic>? _mapBody(dynamic source) {
    if (source is Map<String, dynamic>) return source;
    return null;
  }
}
