import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/home_shell.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/dashboard_models.dart';

/// Up to 4 in-progress lessons with a Resume CTA — mirrors
/// dashboard/page.tsx:169-195 on web. Hidden when empty, same as web.
class ContinueLearningSection extends ConsumerWidget {
  const ContinueLearningSection({super.key, required this.items});

  final List<ContinueWatchingItem> items;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text('Continue learning', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            ),
            TextButton(
              style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 30)),
              onPressed: () => ref.read(homeTabIndexProvider.notifier).state = 1,
              child: const Text('View all'),
            ),
          ],
        ),
        const SizedBox(height: 6),
        for (final item in items.take(4))
          Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => context.push('/learn/${item.lessonId}'),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.navy100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.play_arrow_rounded, color: AppColors.navy900),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.titleEn,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: item.percentComplete / 100,
                              minHeight: 5,
                              backgroundColor: AppColors.line,
                              color: AppColors.teal500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        minimumSize: Size.zero,
                      ),
                      onPressed: () => context.push('/learn/${item.lessonId}'),
                      child: const Text('Resume', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
