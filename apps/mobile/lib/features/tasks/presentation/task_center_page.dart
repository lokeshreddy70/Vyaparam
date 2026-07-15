import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../dashboard/presentation/dashboard_page.dart";

class TaskCenterPage extends ConsumerWidget {
  const TaskCenterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: ref.read(moduleRepositoryProvider).loadJobs(),
      builder: (context, jobsSnapshot) {
        return FutureBuilder<List<Map<String, dynamic>>>(
          future: ref.read(moduleRepositoryProvider).loadNotificationQueue(),
          builder: (context, queueSnapshot) {
            if (jobsSnapshot.connectionState == ConnectionState.waiting ||
                queueSnapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final jobs = jobsSnapshot.data ?? const [];
            final queue = queueSnapshot.data ?? const [];

            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Card(
                  child: ListTile(
                    title: const Text("Background Sync"),
                    subtitle: Text("Jobs: ${jobs.length} | Queue: ${queue.length}"),
                    trailing: Wrap(
                      spacing: 8,
                      children: [
                        FilledButton.tonal(
                          onPressed: () async {
                            await ref.read(moduleRepositoryProvider).processJobs();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Job processing triggered")));
                            }
                          },
                          child: const Text("Process Jobs"),
                        ),
                        FilledButton.tonal(
                          onPressed: () async {
                            await ref.read(moduleRepositoryProvider).processQueue();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Queue processing triggered")));
                            }
                          },
                          child: const Text("Process Queue"),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text("Task Queue", style: TextStyle(fontWeight: FontWeight.w700)),
                for (final task in queue.take(100))
                  Card(
                    child: ListTile(
                      title: Text("${task["eventType"] ?? "TASK"}"),
                      subtitle: Text("${task["status"] ?? "PENDING"} | ${task["createdAt"] ?? ""}"),
                    ),
                  ),
              ],
            );
          },
        );
      },
    );
  }
}
