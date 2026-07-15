import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../state/auth_controller.dart";

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider).session;

    if (session == null) {
      return const Center(child: Text("No active session"));
    }

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          child: ListTile(
            title: Text(session.name),
            subtitle: Text(session.email),
            trailing: Text(session.role),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text("Business ID"),
            subtitle: Text(session.businessId ?? "N/A"),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text("Branch ID"),
            subtitle: Text(session.branchId ?? "N/A"),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text("Permission Count"),
            subtitle: Text("${session.permissions.length}"),
          ),
        ),
      ],
    );
  }
}
