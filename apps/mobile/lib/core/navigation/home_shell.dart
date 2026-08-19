import 'package:flutter/material.dart';

import '../../features/courses/presentation/my_courses_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/revision/presentation/revision_screen.dart';
import '../../features/study_plan/presentation/study_plan_screen.dart';
import '../theme/app_theme.dart';

/// The four tabs that make up the signed-in home experience. Each tab owns
/// its own `Scaffold`/`AppBar` — nesting inside this shell's bottom nav bar
/// is deliberate over a go_router `StatefulShellRoute` to keep the M2 surface
/// area small; course-detail and lesson-player push on top as full screens.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  static const _tabs = [
    DashboardScreen(),
    MyCoursesScreen(),
    StudyPlanScreen(),
    RevisionScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
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
