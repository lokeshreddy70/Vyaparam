SmartBiz Mobile Enterprise Platform

Single Flutter application with role-based experience and one shared backend integration layer.

Stack
- Flutter + Dart
- Material 3
- Riverpod
- Go Router
- Hive + SQLite
- Firebase Cloud Messaging
- Secure Storage + Local Auth

Architecture Highlights
- One login, one navigation shell, role-based module visibility.
- Existing backend APIs only under `/api/v1`.
- Persistent login with refresh token flow and manual logout.
- Offline cache for GET calls via Hive.
- Offline mutation queue for selected write operations via SQLite.
- Background sync processor for queued mutations.
- Notification history persistence for push payloads.

Modules
- Dashboard
- Products
- Inventory
- Customers
- Suppliers
- Billing
- Reports
- Employees
- Attendance
- Leave
- Payroll
- Communication
- Files
- Business Settings
- Notifications
- Support

Run
1. Install Flutter SDK.
2. From `apps/mobile` run:
	- `flutter pub get`
	- `flutter analyze`
	- `flutter test`
	- `flutter build apk --release`

API Base URL
- Default: `http://localhost:3000`
- Override with:
  `flutter run --dart-define=API_BASE_URL=https://your-host`
