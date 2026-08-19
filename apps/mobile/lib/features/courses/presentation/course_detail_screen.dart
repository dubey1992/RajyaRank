import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../wishlist/data/wishlist_repository.dart';
import '../data/course_models.dart';
import '../data/course_repository.dart';

class CourseDetailScreen extends ConsumerWidget {
  const CourseDetailScreen({super.key, required this.courseId});

  final String courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(courseCurriculumProvider(courseId));
    final wishlistIds = ref.watch(wishlistCourseIdsProvider);
    final wishlisted = wishlistIds.maybeWhen(
      data: (ids) => ids.contains(courseId),
      orElse: () => false,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Course'),
        actions: [
          IconButton(
            icon: Icon(wishlisted ? Icons.favorite : Icons.favorite_border),
            onPressed: () async {
              await ref.read(wishlistRepositoryProvider).toggle(courseId);
              ref.invalidate(wishlistCourseIdsProvider);
            },
          ),
        ],
      ),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
          ),
        ),
        data: (course) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(course.titleEn, style: Theme.of(context).textTheme.titleLarge),
            if (course.descEn != null && course.descEn!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                course.descEn!,
                style: const TextStyle(color: AppColors.muted),
              ),
            ],
            const SizedBox(height: 12),
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
              '${course.lessonsCompleted}/${course.lessonsTotal} lessons · ${course.percentComplete}%',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
            const SizedBox(height: 20),
            for (final module in course.modules)
              _ModuleTile(
                module: module,
                onLessonTap: (lesson) =>
                    _openLesson(context, lesson, ref, courseId),
              ),
          ],
        ),
      ),
    );
  }

  void _openLesson(
    BuildContext context,
    StudentCourseLesson lesson,
    WidgetRef ref,
    String courseId,
  ) {
    if (!lesson.accessible) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unlock this course to access this lesson.'),
        ),
      );
      return;
    }
    context.push('/learn/${lesson.lessonId}');
  }
}

class _ModuleTile extends StatelessWidget {
  const _ModuleTile({required this.module, required this.onLessonTap});

  final StudentCourseModule module;
  final ValueChanged<StudentCourseLesson> onLessonTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        title: Text(
          module.nameEn,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text('${module.lessons.length} lessons'),
        children: [
          for (final lesson in module.lessons)
            ListTile(
              leading: Icon(_lessonIcon(lesson), color: _lessonIconColor(lesson)),
              title: Text(lesson.titleEn),
              trailing: Text(
                _ctaLabel(lesson),
                style: const TextStyle(
                  color: AppColors.navy900,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              onTap: () => onLessonTap(lesson),
            ),
        ],
      ),
    );
  }

  IconData _lessonIcon(StudentCourseLesson lesson) {
    if (!lesson.accessible) return Icons.lock_outline;
    if (lesson.status == LessonProgressStatus.completed) {
      return Icons.check_circle;
    }
    final type = lesson.lessonType.toUpperCase();
    if (type == 'PDF' || type == 'DOCUMENT') return Icons.picture_as_pdf_outlined;
    if (type == 'QUIZ' || type == 'TEST') return Icons.quiz_outlined;
    return Icons.play_circle_outline;
  }

  Color _lessonIconColor(StudentCourseLesson lesson) {
    if (!lesson.accessible) return AppColors.muted;
    if (lesson.status == LessonProgressStatus.completed) {
      return AppColors.success;
    }
    return AppColors.navy800;
  }

  String _ctaLabel(StudentCourseLesson lesson) {
    if (!lesson.accessible) return 'Unlock';
    return switch (lesson.status) {
      LessonProgressStatus.completed => 'Review',
      LessonProgressStatus.inProgress => 'Continue',
      LessonProgressStatus.none => 'Start',
    };
  }
}
