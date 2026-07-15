import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../state/auth_controller.dart";

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  final TextEditingController _pinController = TextEditingController();

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.session;

    if (session == null) return const Center(child: Text("Not signed in"));

    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Card(
          child: SwitchListTile(
            value: session.biometricEnabled,
            onChanged: (value) => ref.read(authControllerProvider.notifier).setBiometric(value),
            title: const Text("Biometric Login"),
            subtitle: const Text("Use fingerprint/face unlock for session lock screen"),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("PIN Lock", style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                TextField(
                  controller: _pinController,
                  keyboardType: TextInputType.number,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: "Set or update PIN"),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () async {
                    await ref.read(authControllerProvider.notifier).setPin(_pinController.text);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("PIN saved")));
                    }
                  },
                  child: const Text("Save PIN"),
                ),
              ],
            ),
          ),
        ),
        Card(
          child: ListTile(
            title: const Text("Manual Lock"),
            subtitle: const Text("Keep user logged in until manual logout"),
            trailing: OutlinedButton(
              onPressed: () => ref.read(authControllerProvider.notifier).lock(),
              child: const Text("Lock"),
            ),
          ),
        ),
      ],
    );
  }
}
