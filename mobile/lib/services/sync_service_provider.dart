import 'package:flutter/material.dart';
import '../features/incidents/services/sync_service.dart';

class SyncServiceProvider extends InheritedWidget {
  final SyncService syncService;

  const SyncServiceProvider({
    super.key,
    required this.syncService,
    required super.child,
  });

  static SyncService? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<SyncServiceProvider>()?.syncService;
  }

  @override
  bool updateShouldNotify(covariant SyncServiceProvider oldWidget) {
    return oldWidget.syncService != syncService;
  }
}