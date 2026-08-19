import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/revision_models.dart';
import '../data/revision_repository.dart';

class RevisionScreen extends ConsumerWidget {
  const RevisionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weakTopics = ref.watch(weakTopicsProvider);
    final revision = ref.watch(revisionDataProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Revision')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(weakTopicsProvider);
          ref.invalidate(revisionDataProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Weak topics', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            weakTopics.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Text(
                apiErrorMessage(error),
                style: const TextStyle(color: AppColors.danger),
              ),
              data: (topics) => topics.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        "No weak areas detected yet — keep attempting tests.",
                        style: TextStyle(color: AppColors.muted),
                      ),
                    )
                  : Column(
                      children: [
                        for (final topic in topics) _WeakTopicRow(topic: topic),
                      ],
                    ),
            ),
            const SizedBox(height: 24),
            Text(
              'Continue where you left off',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            revision.when(
              loading: () => const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (error, _) => Text(
                apiErrorMessage(error),
                style: const TextStyle(color: AppColors.danger),
              ),
              data: (data) => data.inProgress.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Nothing in progress right now.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    )
                  : Column(
                      children: [
                        for (final lesson in data.inProgress)
                          _LessonRow(
                            title: lesson.titleEn,
                            trailing: lesson.percentComplete != null
                                ? '${lesson.percentComplete}%'
                                : null,
                            onTap: () =>
                                context.push('/learn/${lesson.lessonId}'),
                          ),
                      ],
                    ),
            ),
            const SizedBox(height: 24),
            Text('Saved lessons', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            revision.when(
              loading: () => const SizedBox.shrink(),
              error: (error, _) => const SizedBox.shrink(),
              data: (data) => data.bookmarked.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        "Bookmark a lesson from its player to save it here.",
                        style: TextStyle(color: AppColors.muted),
                      ),
                    )
                  : Column(
                      children: [
                        for (final lesson in data.bookmarked)
                          _LessonRow(
                            title: lesson.titleEn,
                            trailing: null,
                            onTap: () =>
                                context.push('/learn/${lesson.lessonId}'),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WeakTopicRow extends StatelessWidget {
  const _WeakTopicRow({required this.topic});

  final WeakTopic topic;

  @override
  Widget build(BuildContext context) {
    final percent = (topic.accuracy * 100).round();
    final color = percent < 50
        ? AppColors.danger
        : (percent < 75 ? AppColors.warning : AppColors.success);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Row(
          children: [
            Expanded(child: Text(topic.nameEn)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '$percent% accuracy',
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({
    required this.title,
    required this.trailing,
    required this.onTap,
  });

  final String title;
  final String? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.play_circle_outline, color: AppColors.navy800),
        title: Text(title),
        trailing: trailing != null
            ? Text(trailing!, style: const TextStyle(color: AppColors.muted))
            : const Icon(Icons.chevron_right, color: AppColors.muted),
        onTap: onTap,
      ),
    );
  }
}
