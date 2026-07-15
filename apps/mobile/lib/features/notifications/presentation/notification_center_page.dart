import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../state/providers.dart";
import "../../dashboard/presentation/dashboard_page.dart";

class NotificationCenterPage extends ConsumerWidget {
  const NotificationCenterPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: ref.read(moduleRepositoryProvider).loadNotifications(),
      builder: (context, deliveriesSnapshot) {
        return FutureBuilder<List<Map<String, dynamic>>>(
          future: ref.read(moduleRepositoryProvider).loadNotificationQueue(),
          builder: (context, queueSnapshot) {
            if (deliveriesSnapshot.connectionState == ConnectionState.waiting ||
                queueSnapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final deliveries = deliveriesSnapshot.data ?? const [];
            final queue = queueSnapshot.data ?? const [];

            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Card(
                  child: ListTile(
                    title: const Text("Notification Queue"),
                    subtitle: Text("Pending: ${queue.length}"),
                    trailing: FilledButton.tonal(
                      onPressed: () async {
                        await ref.read(moduleRepositoryProvider).processQueue();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Queue processing triggered")));
                        }
                      },
                      child: const Text("Process"),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  child: ListTile(
                    title: const Text("Local Push History"),
                    subtitle: FutureBuilder<List<Map<String, dynamic>>>(
                      future: ref.read(notificationServiceProvider).localHistory(),
                      builder: (context, snapshot) {
                        final count = snapshot.data?.length ?? 0;
                        return Text("Stored on device: $count");
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Text("Delivery History", style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                for (final item in deliveries.take(100))
                  Card(
                    child: ListTile(
                      title: Text("${item["channel"] ?? "Notification"} - ${item["status"] ?? "unknown"}"),
                      subtitle: Text("${item["eventType"] ?? "EVENT"} | ${item["createdAt"] ?? ""}"),
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
