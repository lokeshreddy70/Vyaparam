import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../dashboard/presentation/dashboard_page.dart";

class GlobalSearchPage extends ConsumerStatefulWidget {
  const GlobalSearchPage({super.key});

  @override
  ConsumerState<GlobalSearchPage> createState() => _GlobalSearchPageState();
}

class _GlobalSearchPageState extends ConsumerState<GlobalSearchPage> {
  final TextEditingController _controller = TextEditingController();
  Future<List<Map<String, dynamic>>>? _future;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: const InputDecoration(
                    labelText: "Global Search",
                    hintText: "Products, customers, suppliers",
                  ),
                  onSubmitted: (_) => _search(),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _search, child: const Text("Search")),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _future == null
                ? const Center(child: Text("Search across enterprise modules"))
                : FutureBuilder<List<Map<String, dynamic>>>(
                    future: _future,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (snapshot.hasError) {
                        return Center(child: Text("Search failed: ${snapshot.error}"));
                      }

                      final items = snapshot.data ?? const [];
                      if (items.isEmpty) return const Center(child: Text("No results"));

                      return ListView.builder(
                        itemCount: items.length,
                        itemBuilder: (context, index) {
                          final row = items[index];
                          final type = row["type"];
                          final data = row["data"];
                          return Card(
                            child: ListTile(
                              title: Text("$type"),
                              subtitle: Text("$data"),
                            ),
                          );
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _search() {
    final query = _controller.text.trim();
    setState(() {
      _future = ref.read(moduleRepositoryProvider).globalSearch(query);
    });
  }
}
