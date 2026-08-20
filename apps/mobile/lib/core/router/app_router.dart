import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/account/presentation/account_screen.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/signup_screen.dart';
import '../../features/courses/presentation/course_catalogue_screen.dart';
import '../../features/courses/presentation/course_detail_screen.dart';
import '../../features/current_affairs/presentation/current_affairs_screen.dart';
import '../../features/doubts/presentation/doubts_screen.dart';
import '../../features/lesson/presentation/lesson_player_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/payments/presentation/order_history_screen.dart';
import '../../features/payments/presentation/pricing_screen.dart';
import '../../features/payments/presentation/saved_cards_screen.dart';
import '../../features/pyq/presentation/pyq_screen.dart';
import '../../features/search/presentation/search_screen.dart';
import '../../features/support/presentation/support_tickets_screen.dart';
import '../../features/tests/presentation/test_review_screen.dart';
import '../../features/tests/presentation/test_runner_screen.dart';
import '../../features/wishlist/presentation/wishlist_screen.dart';
import '../auth/auth_repository.dart';
import '../navigation/home_shell.dart';

const _publicRoutes = {'/login', '/signup', '/forgot-password'};

/// Matches web's `/courses` (catalogue) and `/courses/{id}` (detail) —
/// publicly browsable there (search/filter/syllabus/pricing/ratings, no
/// login wall; see `apps/api/src/catalogue/catalogue.controller.ts`'s
/// `@Public()` routes), so the app mirrors that instead of forcing a login
/// screen before a prospective student can see anything.
bool _isCoursesBrowsing(String location) =>
    location == '/courses' || location.startsWith('/courses/');

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: _AuthListenable(ref),
    redirect: (context, state) {
      final status = ref.read(authControllerProvider).status;
      final loc = state.matchedLocation;
      final onPublicRoute = _publicRoutes.contains(loc);
      final browsingCourses = _isCoursesBrowsing(loc);

      if (status == AuthStatus.unknown) return null;
      if (status == AuthStatus.signedOut && !onPublicRoute && !browsingCourses) {
        return '/courses';
      }
      if (status == AuthStatus.signedIn && loc == '/login') return '/dashboard';
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
        path: '/courses',
        builder: (context, state) => const CourseCatalogueScreen(),
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
      GoRoute(
        path: '/tests/runner',
        builder: (context, state) =>
            TestRunnerScreen(args: state.extra as RunnerArgs),
      ),
      GoRoute(
        path: '/tests/review/:attemptId',
        builder: (context, state) => TestReviewScreen(
          attemptId: state.pathParameters['attemptId']!,
        ),
      ),
      GoRoute(
        path: '/account',
        builder: (context, state) => const AccountScreen(),
      ),
      GoRoute(
        path: '/account/orders',
        builder: (context, state) => const OrderHistoryScreen(),
      ),
      GoRoute(
        path: '/account/cards',
        builder: (context, state) => const SavedCardsScreen(),
      ),
      GoRoute(
        path: '/pricing',
        builder: (context, state) => const PricingScreen(),
      ),
      GoRoute(path: '/pyq', builder: (context, state) => const PyqScreen()),
      GoRoute(
        path: '/doubts',
        builder: (context, state) => const DoubtsScreen(),
      ),
      GoRoute(
        path: '/current-affairs',
        builder: (context, state) => const CurrentAffairsScreen(),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/wishlist',
        builder: (context, state) => const WishlistScreen(),
      ),
      GoRoute(
        path: '/support',
        builder: (context, state) => const SupportTicketsScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
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
