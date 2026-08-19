import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/login_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../auth/auth_repository.dart';

/// M0-scope router: two destinations (login, dashboard). Later milestones
/// (M2-M6 in the build plan) add branches under a persistent bottom-nav shell
/// via go_router's StatefulShellRoute — not needed yet for a single screen.
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loggingIn = state.matchedLocation == '/login';

      if (status == AuthStatus.unknown) return null;
      if (status == AuthStatus.signedOut && !loggingIn) return '/login';
      if (status == AuthStatus.signedIn && loggingIn) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
    ],
  );
});

/// Bridges Riverpod's [AuthController] state changes into go_router's
/// Listenable-based refresh mechanism so a login/logout re-evaluates [redirect].
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(Ref ref) {
    ref.listen(authControllerProvider, (_, _) => notifyListeners());
  }
}
