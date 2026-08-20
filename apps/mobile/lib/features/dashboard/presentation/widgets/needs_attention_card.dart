import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/navigation/home_shell.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/dashboard_repository.dart';

/// Top-3 weak topics — mirrors dashboard/page.tsx:251-274 on web. Hidden
/// entirely when there are none, same as web.
class NeedsAttentionCard extends ConsumerWidget {
  const NeedsAttentionCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weakTopics = ref.watch(weakTopicsProvider);
    return weakTopics.maybeWhen(
      data: (topics) {
        if (topics.isEmpty) return const SizedBox.shrink();
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text('Needs attention', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 30),
                    ),
                    onPressed: () => ref.read(homeTabIndexProvider.notifier).state = 4,
                    child: const Text('Revise'),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              for (final topic in topics.take(3))
                Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: Text(topic.nameEn, style: const TextStyle(fontSize: 13))),
                          Text('${topic.accuracy}%', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: topic.accuracy / 100,
                          minHeight: 6,
                          backgroundColor: AppColors.line,
                          color: _accuracyColor(topic.accuracy),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }

  Color _accuracyColor(int accuracy) {
    if (accuracy < 50) return AppColors.danger;
    if (accuracy < 75) return AppColors.warning;
    return AppColors.teal500;
  }
}
