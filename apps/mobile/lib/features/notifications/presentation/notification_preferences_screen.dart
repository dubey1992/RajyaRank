import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/notification_models.dart';
import '../data/notification_repository.dart';

class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  ConsumerState<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends ConsumerState<NotificationPreferencesScreen> {
  NotificationPreferences? _prefs;
  bool _saving = false;

  Future<void> _save(NotificationPreferences next) async {
    setState(() {
      _prefs = next;
      _saving = true;
    });
    try {
      await ref.read(notificationRepositoryProvider).setPreferences(next);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final loaded = ref.watch(notificationPreferencesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Preferences'),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                ),
              ),
            ),
        ],
      ),
      body: loaded.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
          ),
        ),
        data: (initial) {
          final prefs = _prefs ?? initial;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SwitchListTile(
                title: const Text('Email notifications'),
                value: prefs.emailEnabled,
                onChanged: (v) => _save(prefs.copyWith(emailEnabled: v)),
              ),
              SwitchListTile(
                title: const Text('SMS notifications'),
                value: prefs.smsEnabled,
                onChanged: (v) => _save(prefs.copyWith(smsEnabled: v)),
              ),
              SwitchListTile(
                title: const Text('Push notifications'),
                value: prefs.pushEnabled,
                onChanged: (v) => _save(prefs.copyWith(pushEnabled: v)),
              ),
              const SizedBox(height: 16),
              Text('Mute by category', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 4),
              const Text(
                'Security and payment notifications can’t be muted.',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
              const SizedBox(height: 10),
              for (final category in mutableNotificationCategories)
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(categoryLabel(category)),
                  value: !prefs.mutedCategories.contains(category),
                  onChanged: (enabled) {
                    final next = Set<String>.from(prefs.mutedCategories);
                    if (enabled == true) {
                      next.remove(category);
                    } else {
                      next.add(category);
                    }
                    _save(prefs.copyWith(mutedCategories: next));
                  },
                ),
            ],
          );
        },
      ),
    );
  }
}
