import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/notification_repository.dart';
import 'notification_preferences_screen.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune),
            tooltip: 'Preferences',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => const NotificationPreferencesScreen(),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.done_all),
            tooltip: 'Mark all read',
            onPressed: () async {
              await ref.read(notificationRepositoryProvider).markAllRead();
              ref.invalidate(notificationsProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(notificationsProvider),
        child: notifications.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
            ),
          ),
          data: (list) => list.isEmpty
              ? const Center(
                  child: Text(
                    "You're all caught up.",
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final item = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      color: item.read ? null : AppColors.navy100.withValues(alpha: 0.4),
                      child: ListTile(
                        title: Text(
                          item.titleEn,
                          style: TextStyle(
                            fontWeight: item.read ? FontWeight.w400 : FontWeight.w700,
                          ),
                        ),
                        subtitle: item.bodyEn != null && item.bodyEn!.isNotEmpty
                            ? Text(item.bodyEn!)
                            : null,
                        trailing: !item.read
                            ? const Icon(Icons.circle, size: 8, color: AppColors.orange500)
                            : null,
                        onTap: item.read
                            ? null
                            : () async {
                                await ref
                                    .read(notificationRepositoryProvider)
                                    .markRead(item.id);
                                ref.invalidate(notificationsProvider);
                              },
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
