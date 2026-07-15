class UserSession {
  const UserSession({
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    this.businessId,
    this.branchId,
    required this.accessToken,
    required this.refreshToken,
    required this.permissions,
    this.pinEnabled = false,
    this.biometricEnabled = false,
  });

  final String userId;
  final String name;
  final String email;
  final String role;
  final String? businessId;
  final String? branchId;
  final String accessToken;
  final String refreshToken;
  final List<String> permissions;
  final bool pinEnabled;
  final bool biometricEnabled;

  Map<String, dynamic> toJson() {
    return {
      "userId": userId,
      "name": name,
      "email": email,
      "role": role,
      "businessId": businessId,
      "branchId": branchId,
      "accessToken": accessToken,
      "refreshToken": refreshToken,
      "permissions": permissions,
      "pinEnabled": pinEnabled,
      "biometricEnabled": biometricEnabled,
    };
  }

  factory UserSession.fromJson(Map<String, dynamic> json) {
    final permissionRaw = json["permissions"];
    return UserSession(
      userId: (json["userId"] ?? "") as String,
      name: (json["name"] ?? "") as String,
      email: (json["email"] ?? "") as String,
      role: (json["role"] ?? "EMPLOYEE") as String,
      businessId: json["businessId"] as String?,
      branchId: json["branchId"] as String?,
      accessToken: (json["accessToken"] ?? "") as String,
      refreshToken: (json["refreshToken"] ?? "") as String,
      permissions: permissionRaw is List ? permissionRaw.map((e) => "$e").toList() : const [],
      pinEnabled: (json["pinEnabled"] ?? false) as bool,
      biometricEnabled: (json["biometricEnabled"] ?? false) as bool,
    );
  }

  UserSession copyWith({
    String? accessToken,
    String? refreshToken,
    bool? pinEnabled,
    bool? biometricEnabled,
    List<String>? permissions,
  }) {
    return UserSession(
      userId: userId,
      name: name,
      email: email,
      role: role,
      businessId: businessId,
      branchId: branchId,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      permissions: permissions ?? this.permissions,
      pinEnabled: pinEnabled ?? this.pinEnabled,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
    );
  }
}
