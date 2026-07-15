import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../../core/config/app_config.dart";
import "../../../core/services/module_repository.dart";
import "../../../models/module_item.dart";
import "../../../state/auth_controller.dart";
import "../../../state/providers.dart";

final moduleRepositoryProvider = Provider<ModuleRepository>((ref) {
  return ModuleRepository(apiClient: ref.watch(apiClientProvider));
});

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;
    final role = session?.role ?? "EMPLOYEE";

    final allowedKeys = AppConfig.roleToModuleKeys[role] ?? const <String>[];
    final modules = AppConfig.modules.where((m) => allowedKeys.contains(m.key)).toList(growable: false);

    return RefreshIndicator(
      onRefresh: () => ref.read(apiClientProvider).processBackgroundSync(),
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Welcome ${session?.name ?? ""}", style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 6),
                  Text("Role: $role"),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _QuickActionButton(label: "Clock In", actionKey: "clock-in"),
                      _QuickActionButton(label: "Clock Out", actionKey: "clock-out"),
                      _QuickActionButton(label: "Process Queue", actionKey: "process-queue"),
                      _QuickActionButton(label: "Process Jobs", actionKey: "process-jobs"),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text("Role-based modules", style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth >= 1000
                  ? 4
                  : constraints.maxWidth >= 700
                      ? 3
                      : 2;

              return GridView.builder(
                itemCount: modules.length,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: crossAxisCount,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1.6,
                ),
                itemBuilder: (context, index) {
                  final module = modules[index];
                  return _ModuleTile(module: module);
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _ModuleTile extends StatelessWidget {
  const _ModuleTile({required this.module});

  final ModuleItem module;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go(module.route),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),
              Text(module.title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(module.key, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickActionButton extends ConsumerWidget {
  const _QuickActionButton({required this.label, required this.actionKey});

  final String label;
  final String actionKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FilledButton.tonal(
      onPressed: () async {
        await ref.read(moduleRepositoryProvider).runQuickAction(actionKey);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("$label executed")),
          );
        }
      },
      child: Text(label),
    );
  }
}
