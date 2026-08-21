import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth/auth_repository.dart';
import 'core/notifications/fcm_service.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // runApp() first, unconditionally — the native splash only dismisses once
  // Flutter renders its first frame, so nothing before this line may ever
  // await Firebase. Firebase.initializeApp() and Crashlytics setup used to
  // run here with no timeout; Crashlytics' first-run device registration is
  // a real network call, and on a fresh install with no prior Firebase
  // Installation ID, a slow/blocked network left the app stuck on the
  // splash screen forever — reproducing on every relaunch since the
  // underlying network condition wasn't transient. Push notifications and
  // crash reporting are best-effort features; the app starting is not.
  runApp(const ProviderScope(child: RajyaRankApp()));
  unawaited(_initFirebase());
}

Future<void> _initFirebase() async {
  const timeout = Duration(seconds: 8);
  try {
    await Firebase.initializeApp().timeout(timeout);
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    // Only report real installs, not every hot-reload/debug session on a dev
    // machine — matches the same debug/release split as release signing.
    await FirebaseCrashlytics.instance
        .setCrashlyticsCollectionEnabled(!kDebugMode)
        .timeout(timeout);
    FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterFatalError;
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  } catch (_) {
    // Firebase unreachable/timed out/misconfigured — push notifications and
    // crash reporting silently stay off for this session. Everything else
    // (auth, courses, tests, payments) has no Firebase dependency.
  }
}

class RajyaRankApp extends ConsumerWidget {
  const RajyaRankApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    ref.listen(authControllerProvider, (previous, next) {
      if (next.status == AuthStatus.signedIn) {
        registerFcmToken(ref);
      }
    });
    setupNotificationTapHandling(router);

    return MaterialApp.router(
      title: 'RajyaRank',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
