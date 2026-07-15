class ModuleItem {
  const ModuleItem({
    required this.key,
    required this.title,
    required this.route,
    this.permission,
  });

  final String key;
  final String title;
  final String route;
  final String? permission;
}
