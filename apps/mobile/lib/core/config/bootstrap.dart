import "package:firebase_core/firebase_core.dart";
import "package:hive_flutter/hive_flutter.dart";

import "../storage/local_database.dart";

Future<void> bootstrap() async {
  await Hive.initFlutter();
  await LocalDatabase.instance.initialize();

  // Firebase initialization is optional at runtime; app keeps working without config.
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Intentionally ignored to keep app booting across environments.
  }
}
