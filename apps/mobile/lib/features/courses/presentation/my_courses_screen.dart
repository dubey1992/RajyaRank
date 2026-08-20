import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/course_models.dart';
import '../data/course_repository.dart';

class MyCoursesScreen extends ConsumerWidget {
  const MyCoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final owned = ref.watch(myCoursesProvider);
    final institute = ref.watch(instituteCoursesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Courses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.explore_outlined),
            tooltip: 'Explore courses',
            onPressed: () => context.push('/courses'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myCoursesProvider);
          ref.invalidate(instituteCoursesProvider);
        },
        child: owned.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(
            message: apiErrorMessage(error),
            onRetry: () => ref.invalidate(myCoursesProvider),
          ),
          data: (courses) {
            final instituteOnly = institute.maybeWhen(
              data: (list) => list.where((c) => !c.entitled).toList(),
              orElse: () => const <InstituteCourseSummary>[],
            );
            if (courses.isEmpty && instituteOnly.isEmpty) {
              return const _EmptyState();
            }
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final course in courses)
                  _OwnedCourseCard(
                    course: course,
                    onTap: () => context.push('/courses/${course.courseId}'),
                  ),
                if (instituteOnly.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Available through your institute',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  for (final course in instituteOnly)
                    Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text(course.titleEn),
                        subtitle: const Text('Not yet unlocked'),
                        trailing: const Icon(
                          Icons.lock_outline,
                          color: AppColors.muted,
                        ),
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _OwnedCourseCard extends StatelessWidget {
  const _OwnedCourseCard({required this.course, required this.onTap});

  final StudentCourseSummary course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                course.titleEn,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                '${course.lessonsCompleted} / ${course.lessonsTotal} lessons complete',
                style: const TextStyle(color: AppColors.muted, fontSize: 13),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: course.percentComplete / 100,
                  minHeight: 8,
                  backgroundColor: AppColors.line,
                  color: AppColors.teal500,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${course.percentComplete}% complete',
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.menu_book_outlined,
              size: 40,
              color: AppColors.muted,
            ),
            const SizedBox(height: 12),
            const Text(
              "You haven't enrolled in any courses yet.",
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
