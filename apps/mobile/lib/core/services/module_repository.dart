import "package:dio/dio.dart";

import "api_client.dart";

class ModuleRepository {
  ModuleRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  static const Map<String, String> moduleEndpoints = {
    "products": "/products",
    "inventory": "/inventory",
    "customers": "/customers",
    "suppliers": "/suppliers",
    "billing": "/billing-pos/documents",
    "reports": "/reports-analytics/dashboard",
    "ai-platform": "/reports-analytics/dashboard",
    "employees": "/employees",
    "attendance": "/hrms/attendance",
    "leave": "/hrms/leave-requests",
    "payroll": "/hrms/payroll",
    "communication": "/notifications/announcements",
    "files": "/documents",
    "business-settings": "/settings/business-configuration",
    "support": "/notifications/queue",
  };

  Future<List<Map<String, dynamic>>> loadModuleItems(String moduleKey) async {
    final endpoint = moduleEndpoints[moduleKey];
    if (endpoint == null) return const [];

    final response = await _apiClient.dio.get<dynamic>(endpoint, queryParameters: {"page": 1, "limit": 100});
    return _listFromResponse(response);
  }

  Future<Map<String, dynamic>> loadDashboard() async {
    final response = await _apiClient.dio.get<dynamic>("/reports-analytics/dashboard");
    return _mapFromResponse(response);
  }

  Future<List<Map<String, dynamic>>> loadNotifications() async {
    final response = await _apiClient.dio.get<dynamic>(
      "/notifications/history/deliveries",
      queryParameters: {"page": 1, "limit": 100},
    );
    return _listFromResponse(response);
  }

  Future<List<Map<String, dynamic>>> loadNotificationQueue() async {
    final response = await _apiClient.dio.get<dynamic>(
      "/notifications/queue",
      queryParameters: {"page": 1, "limit": 100},
    );
    return _listFromResponse(response);
  }

  Future<List<Map<String, dynamic>>> loadJobs() async {
    final response = await _apiClient.dio.get<dynamic>(
      "/monitoring/jobs",
      queryParameters: {"page": 1, "limit": 100},
    );
    return _listFromResponse(response);
  }

  Future<void> processQueue() async {
    await _apiClient.dio.post<dynamic>("/notifications/queue/process");
  }

  Future<void> processJobs() async {
    await _apiClient.dio.post<dynamic>("/monitoring/jobs/process", data: {"take": 100});
  }

  Future<List<Map<String, dynamic>>> globalSearch(String query) async {
    if (query.isEmpty) return const [];

    final results = <Map<String, dynamic>>[];

    final products = await _apiClient.dio.get<dynamic>("/products", queryParameters: {"page": 1, "limit": 20, "q": query});
    for (final item in _listFromResponse(products)) {
      results.add({"type": "Product", "data": item});
    }

    final customers = await _apiClient.dio.get<dynamic>("/customers", queryParameters: {"page": 1, "limit": 20, "q": query});
    for (final item in _listFromResponse(customers)) {
      results.add({"type": "Customer", "data": item});
    }

    final suppliers = await _apiClient.dio.get<dynamic>("/suppliers", queryParameters: {"page": 1, "limit": 20, "q": query});
    for (final item in _listFromResponse(suppliers)) {
      results.add({"type": "Supplier", "data": item});
    }

    return results;
  }

  Future<void> runQuickAction(String actionKey) async {
    switch (actionKey) {
      case "clock-in":
        await _apiClient.dio.post<dynamic>("/hrms/attendance/clock-in");
        return;
      case "clock-out":
        await _apiClient.dio.post<dynamic>("/hrms/attendance/clock-out");
        return;
      case "process-queue":
        await processQueue();
        return;
      case "process-jobs":
        await processJobs();
        return;
      default:
        return;
    }
  }

  List<Map<String, dynamic>> _listFromResponse(Response<dynamic> response) {
    final body = response.data;
    if (body is List) {
      return body.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
    }

    if (body is Map<String, dynamic>) {
      final nested = body["data"];
      if (nested is List) {
        return nested.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
      }
      if (nested is Map<String, dynamic>) {
        final items = nested["items"];
        if (items is List) {
          return items.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
        }
        return [nested];
      }

      final items = body["items"];
      if (items is List) {
        return items.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
      }

      return [body];
    }

    return const [];
  }

  Map<String, dynamic> _mapFromResponse(Response<dynamic> response) {
    final body = response.data;
    if (body is Map<String, dynamic>) {
      final nested = body["data"];
      if (nested is Map<String, dynamic>) return nested;
      return body;
    }
    return <String, dynamic>{};
  }
}
