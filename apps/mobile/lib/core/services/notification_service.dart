import "dart:convert";

import "package:firebase_messaging/firebase_messaging.dart";

import "../storage/local_database.dart";

class NotificationService {
  NotificationService({FirebaseMessaging? messaging})
      : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  Future<void> initialize() async {
    try {
      await _messaging.requestPermission();
      FirebaseMessaging.onMessage.listen(_onMessage);
      FirebaseMessaging.onMessageOpenedApp.listen(_onMessage);
    } catch (_) {
      // FCM configuration may be unavailable in local/dev environments.
    }
  }

  Future<void> _onMessage(RemoteMessage message) async {
    final db = LocalDatabase.instance.db;
    await db.insert(
      "notification_history",
      {
        "id": message.messageId ?? DateTime.now().microsecondsSinceEpoch.toString(),
        "title": message.notification?.title,
        "body": message.notification?.body,
        "payload": jsonEncode(message.data),
        "created_at": DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> localHistory() async {
    final db = LocalDatabase.instance.db;
    return db.query("notification_history", orderBy: "created_at DESC", limit: 200);
  }
}
