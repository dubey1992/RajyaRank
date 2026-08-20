import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/courses/presentation/my_courses_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/revision/presentation/revision_screen.dart';
import '../../features/study_plan/presentation/study_plan_screen.dart';
import '../../features/tests/presentation/test_catalogue_screen.dart';
import '../theme/app_theme.dart';

/// Lets a widget inside one tab (e.g. a dashboard "View study plan" button)
/// switch to another tab, since tabs aren't separate go_router routes — see
/// [HomeShell]'s class doc for why.
final homeTabIndexProvider = StateProvider<int>((ref) => 0);

/// The five tabs that make up the signed-in home experience. Each tab owns
/// its own `Scaffold`/`AppBar` — nesting inside this shell's bottom nav bar
/// is deliberate over a go_router `StatefulShellRoute` to keep the M2 surface
/// area small; course-detail and lesson-player push on top as full screens.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key});

  static const _tabs = [
    DashboardScreen(),
    MyCoursesScreen(),
    TestCatalogueScreen(),
    StudyPlanScreen(),
    RevisionScreen(),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(homeTabIndexProvider);
    return Scaffold(
      body: IndexedStack(index: index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) =>
            ref.read(homeTabIndexProvider.notifier).state = i,
        backgroundColor: Colors.white,
        indicatorColor: AppColors.navy100,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: AppColors.navy900),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book, color: AppColors.navy900),
            label: 'Courses',
          ),
          NavigationDestination(
            icon: Icon(Icons.quiz_outlined),
            selectedIcon: Icon(Icons.quiz, color: AppColors.navy900),
            label: 'Tests',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_note_outlined),
            selectedIcon: Icon(Icons.event_note, color: AppColors.navy900),
            label: 'Study Plan',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_outline),
            selectedIcon: Icon(Icons.bookmark, color: AppColors.navy900),
            label: 'Revision',
          ),
        ],
      ),
    );
  }
}
