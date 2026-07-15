import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/config/app_config.dart";
import "../../dashboard/presentation/dashboard_page.dart";

class ModulePage extends ConsumerWidget {
  const ModulePage({super.key, required this.moduleKey});

  final String moduleKey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final candidates = AppConfig.modules.where((m) => m.key == moduleKey).toList(growable: false);
    final module = candidates.isNotEmpty ? candidates.first : null;

    return FutureBuilder<List<Map<String, dynamic>>>(
      future: ref.read(moduleRepositoryProvider).loadModuleItems(moduleKey),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text("Failed to load module: ${snapshot.error}"));
        }

        final items = snapshot.data ?? const [];
        if (items.isEmpty) {
          return Center(child: Text("No data available for ${module?.title ?? moduleKey}"));
        }

        return ListView.separated(
          padding: const EdgeInsets.all(12),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final item = items[index];
            return Card(
              child: ExpansionTile(
                title: Text(_titleFromMap(item)),
                subtitle: Text(item.keys.take(3).join(" | ")),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: SelectableText(item.entries.map((e) => "${e.key}: ${e.value}").join("\n")),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  String _titleFromMap(Map<String, dynamic> map) {
    final keys = ["name", "title", "label", "code", "id"];
    for (final key in keys) {
      final value = map[key];
      if (value != null && "$value".isNotEmpty) return "$value";
    }
    return "Record";
  }
}
