import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/notifications/data/notification_repository.dart';

/// Required by firebase_messaging even when the notification-payload half of
/// a message is all we send today (see notification.service.ts's emit()) —
/// a background isolate has no existing Firebase app instance, so it must
/// initialize its own. No further handling needed: a `notification` payload
/// is shown by the OS automatically without app code running.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

bool _tokenRefreshListenerAttached = false;

/// Best-effort: push registration must never block or crash the app if the
/// user denies the permission prompt, Firebase isn't reachable, etc. Safe to
/// call every time auth status becomes signedIn — the backend upserts by
/// token (see FcmService.registerToken), so re-registering the same token is
/// a no-op, and calling this after every login also naturally re-links a
/// token to whichever account is currently signed in on this device.
Future<void> registerFcmToken(WidgetRef ref) async {
  try {
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission();
    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    final token = await messaging.getToken();
    if (token != null) {
      await ref
          .read(notificationRepositoryProvider)
          .registerFcmToken(token: token, platform: 'ANDROID');
    }

    if (!_tokenRefreshListenerAttached) {
      _tokenRefreshListenerAttached = true;
      messaging.onTokenRefresh.listen((refreshed) {
        ref
            .read(notificationRepositoryProvider)
            .registerFcmToken(token: refreshed, platform: 'ANDROID')
            .catchError((_) {});
      });
    }
  } catch (_) {
    // Non-fatal — the rest of the app works fine without push.
  }
}

bool _tapHandlingAttached = false;

/// Tapping a notification (from background or a cold start) lands on the
/// in-app notifications list — every push already has a matching Notification
/// row (see NotificationService.emit), so this is never a dead end even
/// though individual messages don't carry a deep-link target yet. Called from
/// the app root's build(), which reruns on every rebuild — guarded so the
/// listener/getInitialMessage lookup only ever happens once per app launch.
/// Wrapped defensively like registerFcmToken above: this must never crash
/// app startup if Firebase isn't ready for any reason (also what makes the
/// widget test runnable without a full Firebase platform mock).
void setupNotificationTapHandling(GoRouter router) {
  if (_tapHandlingAttached) return;
  _tapHandlingAttached = true;
  try {
    FirebaseMessaging.onMessageOpenedApp.listen(
      (message) => router.go('/notifications'),
      onError: (_) {},
    );
    FirebaseMessaging.instance
        .getInitialMessage()
        .then((message) {
          if (message != null) router.go('/notifications');
        })
        .catchError((_) {});
  } catch (_) {
    // Non-fatal — matches registerFcmToken's contract above.
  }
}
