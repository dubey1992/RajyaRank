import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/signup_screen.dart';
import '../../features/courses/presentation/course_detail_screen.dart';
import '../../features/lesson/presentation/lesson_player_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../auth/auth_repository.dart';
import '../navigation/home_shell.dart';

const _publicRoutes = {'/login', '/signup', '/forgot-password'};

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final onPublicRoute = _publicRoutes.contains(state.matchedLocation);

      if (status == AuthStatus.unknown) return null;
      if (status == AuthStatus.signedOut && !onPublicRoute) return '/login';
      if (status == AuthStatus.signedIn && state.matchedLocation == '/login')
        return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const HomeShell(),
      ),
      GoRoute(
        path: '/courses/:courseId',
        builder: (context, state) => CourseDetailScreen(
          courseId: state.pathParameters['courseId']!,
        ),
      ),
      GoRoute(
        path: '/learn/:lessonId',
        builder: (context, state) => LessonPlayerScreen(
          lessonId: state.pathParameters['lessonId']!,
        ),
      ),
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
