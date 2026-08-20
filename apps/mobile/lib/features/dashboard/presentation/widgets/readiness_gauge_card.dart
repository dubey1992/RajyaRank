import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/dashboard_models.dart';
import '../../data/dashboard_repository.dart';

const _dimensions = [
  ('Concept mastery', 35, 'How well you know the concepts you\'ve studied so far.'),
  ('Syllabus coverage', 20, 'How much of your target exam\'s syllabus you\'ve touched.'),
  ('Revision retention', 20, 'Whether earlier topics are still sticking on revisit.'),
  ('Test efficiency', 15, 'Accuracy and pace across your recent test attempts.'),
  ('Consistency', 10, 'How regularly you\'ve been showing up to study.'),
];

class ReadinessGaugeCard extends ConsumerWidget {
  const ReadinessGaugeCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final readiness = ref.watch(readinessProvider);
    return _Frame(
      child: readiness.when(
        loading: () => const SizedBox(
          height: 140,
          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
        ),
        error: (_, _) => const SizedBox.shrink(),
        data: (data) => _Body(data: data),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.data});

  final ReadinessData data;

  @override
  Widget build(BuildContext context) {
    if (!data.available) {
      final onboardingIncomplete = data.reason == 'ONBOARDING_INCOMPLETE';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _Title(),
          const SizedBox(height: 10),
          Text(
            onboardingIncomplete
                ? 'Set a target exam to see your readiness score.'
                : 'Not yet available for your exam.',
            style: const TextStyle(color: AppColors.muted),
          ),
          if (onboardingIncomplete) ...[
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => context.push('/account'),
              child: const Text('Set target exam'),
            ),
          ],
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Title(),
        const SizedBox(height: 14),
        Row(
          children: [
            SizedBox(
              width: 84,
              height: 84,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 84,
                    height: 84,
                    child: CircularProgressIndicator(
                      value: data.score / 100,
                      strokeWidth: 8,
                      backgroundColor: AppColors.line,
                      color: AppColors.teal500,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${data.score}%',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                      ),
                      const Text(
                        'READY',
                        style: TextStyle(fontSize: 9, color: AppColors.muted, letterSpacing: 0.6),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Not a rank or selection predictor — a study-behaviour signal.',
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 32),
                      alignment: Alignment.centerLeft,
                    ),
                    onPressed: () => _showBreakdown(context, data.breakdown!),
                    child: const Text('How is this calculated?'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showBreakdown(BuildContext context, ReadinessBreakdown b) {
    final values = {
      'Concept mastery': b.conceptMastery,
      'Syllabus coverage': b.syllabusCoverage,
      'Revision retention': b.revisionRetention,
      'Test efficiency': b.testEfficiency,
      'Consistency': b.consistency,
    };
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Readiness breakdown', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            const Text(
              'Five weighted dimensions, not a rank or selection predictor.',
              style: TextStyle(color: AppColors.muted, fontSize: 12),
            ),
            const SizedBox(height: 16),
            for (final (name, weight, desc) in _dimensions)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '$name · $weight%',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                        Text('${values[name]}%', style: const TextStyle(color: AppColors.muted)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(desc, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                    const SizedBox(height: 6),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (values[name] ?? 0) / 100,
                        minHeight: 6,
                        backgroundColor: AppColors.line,
                        color: AppColors.teal500,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 8),
          ],
        ),
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
        Icon(Icons.speed_rounded, size: 18, color: AppColors.teal500),
        SizedBox(width: 8),
        Text('Exam readiness', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      ],
    );
  }
}

class _Frame extends StatelessWidget {
  const _Frame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
        boxShadow: AppGradients.softShadow(AppColors.navy900),
      ),
      child: child,
    );
  }
}
