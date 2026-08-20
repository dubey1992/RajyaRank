import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/dashboard_models.dart';
import '../../data/dashboard_repository.dart';

class MistakeDnaCard extends ConsumerWidget {
  const MistakeDnaCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mistakeDna = ref.watch(mistakeDnaProvider);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: mistakeDna.when(
        loading: () => const SizedBox(
          height: 100,
          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
        ),
        error: (_, _) => const SizedBox.shrink(),
        data: (data) => _Body(data: data),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.data});

  final MistakeDnaData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!data.available) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Title(),
          const SizedBox(height: 10),
          const Text(
            'Take a few tests to see your mistake patterns here.',
            style: TextStyle(color: AppColors.muted),
          ),
        ],
      );
    }

    final maxCount = data.byType.isEmpty
        ? 1
        : data.byType.map((e) => e.count).reduce((a, b) => a > b ? a : b);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Title(),
        const SizedBox(height: 4),
        Text(
          '${data.totalWrong} wrong answers · last ${data.windowDays} days',
          style: const TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        const SizedBox(height: 14),
        for (final item in data.byType)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(item.label, style: const TextStyle(fontSize: 13)),
                    ),
                    Text(
                      '${item.count} · ${item.percent}%',
                      style: const TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: maxCount == 0 ? 0 : item.count / maxCount,
                    minHeight: 6,
                    backgroundColor: AppColors.line,
                    color: AppColors.orange500,
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 4),
        TextButton(
          style: TextButton.styleFrom(
            padding: EdgeInsets.zero,
            minimumSize: const Size(0, 32),
            alignment: Alignment.centerLeft,
          ),
          onPressed: () => _showCoach(context, ref),
          child: const Text('3-day Mistake Coach →'),
        ),
      ],
    );
  }

  void _showCoach(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Consumer(
        builder: (context, ref, _) {
          final week = ref.watch(weekPlanItemsProvider);
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Mistake Coach', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 4),
                const Text(
                  'Up to 3 pending drills targeting your recent mistakes.',
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                const SizedBox(height: 16),
                week.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (_, _) => const Text(
                    'Could not load your study plan.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                  data: (items) {
                    final coachItems =
                        items.where((i) => i.isPendingMistakeDrill).take(3).toList();
                    if (coachItems.isEmpty) {
                      return const Text(
                        'No drills scheduled yet.',
                        style: TextStyle(color: AppColors.muted),
                      );
                    }
                    return Column(
                      children: [
                        for (final item in coachItems)
                          Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(item.titleEn),
                              subtitle: Text(
                                '${item.date} · ${item.estimatedMinutes} min'
                                '${item.triggerMistakeType != null ? ' · ${MistakeTypeCount(type: item.triggerMistakeType!, count: 0, percent: 0).label}' : ''}',
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Title extends StatelessWidget {
  const _Title();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        Icon(Icons.psychology_alt_outlined, size: 18, color: AppColors.orange500),
        SizedBox(width: 8),
        Text('Mistake DNA', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      ],
    );
  }
}
