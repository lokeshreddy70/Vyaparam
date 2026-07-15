import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../../core/config/app_config.dart";
import "../../../core/widgets/adaptive_scaffold.dart";
import "../../../models/module_item.dart";
import "../../../state/auth_controller.dart";
import "../../../state/providers.dart";

class AppShellPage extends ConsumerStatefulWidget {
  const AppShellPage({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<AppShellPage> createState() => _AppShellPageState();
}

class _AppShellPageState extends ConsumerState<AppShellPage> {
  Timer? _syncTimer;

  @override
  void initState() {
    super.initState();
    Future<void>(() async {
      await ref.read(notificationServiceProvider).initialize();
      await ref.read(apiClientProvider).processBackgroundSync();
      _syncTimer = Timer.periodic(const Duration(minutes: 2), (_) {
        ref.read(apiClientProvider).processBackgroundSync();
      });
    });
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;

    if (session == null) return widget.child;

    if (auth.locked) {
      return _LockScreen(sessionName: session.name);
    }

    final modules = _visibleModules(session.role, session.permissions);
    final destinations = <NavigationDestination>[
      const NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: "Dashboard"),
      const NavigationDestination(icon: Icon(Icons.search), label: "Search"),
      const NavigationDestination(icon: Icon(Icons.notifications_none), label: "Notify"),
      const NavigationDestination(icon: Icon(Icons.task_outlined), label: "Tasks"),
      const NavigationDestination(icon: Icon(Icons.settings_outlined), label: "Settings"),
    ];

    final path = GoRouterState.of(context).matchedLocation;
    final selectedIndex = switch (path) {
      "/dashboard" => 0,
      "/search" => 1,
      "/notifications" => 2,
      "/tasks" => 3,
      _ => 4,
    };

    return AdaptiveScaffold(
      title: "SmartBiz Mobile",
      selectedIndex: selectedIndex,
      destinations: destinations,
      onSelected: (index) {
        switch (index) {
          case 0:
            context.go("/dashboard");
            break;
          case 1:
            context.go("/search");
            break;
          case 2:
            context.go("/notifications");
            break;
          case 3:
            context.go("/tasks");
            break;
          default:
            context.go("/settings");
        }
      },
      actions: [
        PopupMenuButton<String>(
          onSelected: (value) {
            if (value == "profile") context.go("/profile");
            if (value == "logout") {
              ref.read(authControllerProvider.notifier).logout();
              context.go("/login");
            }
          },
          itemBuilder: (_) => const [
            PopupMenuItem(value: "profile", child: Text("Profile")),
            PopupMenuItem(value: "logout", child: Text("Logout")),
          ],
        )
      ],
      body: Row(
        children: [
          if (MediaQuery.sizeOf(context).width >= 1100)
            SizedBox(
              width: 280,
              child: Card(
                margin: const EdgeInsets.all(8),
                child: ListView(
                  children: [
                    ListTile(
                      title: Text(session.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(session.role),
                      leading: const CircleAvatar(child: Icon(Icons.person_outline)),
                    ),
                    const Divider(),
                    for (final module in modules)
                      ListTile(
                        title: Text(module.title),
                        onTap: () => context.go(module.route),
                      ),
                  ],
                ),
              ),
            ),
          Expanded(child: widget.child),
        ],
      ),
    );
  }

  List<ModuleItem> _visibleModules(String role, List<String> permissions) {
    final allowedKeys = AppConfig.roleToModuleKeys[role] ?? AppConfig.roleToModuleKeys["EMPLOYEE"] ?? const <String>[];

    return AppConfig.modules.where((module) {
      if (!allowedKeys.contains(module.key)) return false;
      if (module.permission == null) return true;
      return permissions.isEmpty || permissions.contains(module.permission);
    }).toList(growable: false);
  }
}

class _LockScreen extends ConsumerStatefulWidget {
  const _LockScreen({required this.sessionName});

  final String sessionName;

  @override
  ConsumerState<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<_LockScreen> {
  final TextEditingController _pinController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text("Welcome back, ${widget.sessionName}", style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                  const SizedBox(height: 8),
                  const Text("Unlock with PIN or biometric"),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _pinController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: "PIN"),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton(
                          onPressed: () async {
                            final ok = await ref.read(authControllerProvider.notifier).unlockWithPin(_pinController.text);
                            if (!ok && mounted) {
                              setState(() => _error = "Invalid PIN");
                            }
                          },
                          child: const Text("Unlock PIN"),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            final ok = await ref.read(authControllerProvider.notifier).unlockWithBiometric();
                            if (!ok && mounted) {
                              setState(() => _error = "Biometric auth failed");
                            }
                          },
                          child: const Text("Biometric"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
