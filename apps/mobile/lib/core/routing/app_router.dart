import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../features/auth/presentation/login_page.dart";
import "../../features/dashboard/presentation/dashboard_page.dart";
import "../../features/modules/presentation/module_page.dart";
import "../../features/notifications/presentation/notification_center_page.dart";
import "../../features/profile/presentation/profile_page.dart";
import "../../features/search/presentation/global_search_page.dart";
import "../../features/settings/presentation/settings_page.dart";
import "../../features/shell/presentation/app_shell_page.dart";
import "../../features/tasks/presentation/task_center_page.dart";
import "../../state/auth_controller.dart";

final appRouterProvider = Provider<GoRouter>((ref) {
  final notifier = RouterNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    refreshListenable: notifier,
    initialLocation: "/dashboard",
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final isOnLogin = state.matchedLocation == "/login";

      if (authState.initializing) return null;
      if (authState.session == null && !isOnLogin) return "/login";
      if (authState.session != null && isOnLogin) return "/dashboard";
      return null;
    },
    routes: [
      GoRoute(path: "/login", builder: (context, state) => const LoginPage()),
      ShellRoute(
        builder: (context, state, child) => AppShellPage(child: child),
        routes: [
          GoRoute(path: "/dashboard", builder: (context, state) => const DashboardPage()),
          GoRoute(path: "/notifications", builder: (context, state) => const NotificationCenterPage()),
          GoRoute(path: "/search", builder: (context, state) => const GlobalSearchPage()),
          GoRoute(path: "/tasks", builder: (context, state) => const TaskCenterPage()),
          GoRoute(path: "/profile", builder: (context, state) => const ProfilePage()),
          GoRoute(path: "/settings", builder: (context, state) => const SettingsPage()),
          GoRoute(
            path: "/modules/:moduleKey",
            builder: (context, state) {
              final moduleKey = state.pathParameters["moduleKey"] ?? "dashboard";
              return ModulePage(moduleKey: moduleKey);
            },
          ),
        ],
      ),
    ],
  );
});

class RouterNotifier extends ChangeNotifier {
  RouterNotifier(this.ref) {
    ref.listen<AuthViewState>(authControllerProvider, (_, __) => notifyListeners());
  }

  final Ref ref;
}
