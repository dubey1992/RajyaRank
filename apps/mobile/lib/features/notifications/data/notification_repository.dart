import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'notification_models.dart';

final notificationsProvider = FutureProvider.autoDispose<List<NotificationItem>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/notifications');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(NotificationItem.fromJson)
      .toList();
});

final notificationPreferencesProvider =
    FutureProvider.autoDispose<NotificationPreferences>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/notifications/preferences');
      return NotificationPreferences.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    });

class NotificationRepository {
  NotificationRepository(this._ref);
  final Ref _ref;

  Future<void> markRead(String id) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch('/student/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch('/student/notifications/read-all');
  }

  Future<void> setPreferences(NotificationPreferences prefs) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch(
      '/student/notifications/preferences',
      data: prefs.toJson(),
    );
  }

  /// POST student/notifications/push/register-fcm-token — scaffolded ahead
  /// of the actual firebase_messaging integration, which is blocked on a
  /// real Firebase project (see docs/mobile-app-build-plan.pdf §6). Safe to
  /// call once a real FCM token exists; the backend no-ops until
  /// FCM_SERVICE_ACCOUNT_JSON is configured either way.
  Future<void> registerFcmToken({
    required String token,
    required String platform,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/student/notifications/push/register-fcm-token',
      data: {'token': token, 'platform': platform},
    );
  }
}

final notificationRepositoryProvider = Provider(
  (ref) => NotificationRepository(ref),
);
