import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/navigation/home_shell.dart';
import '../../../../core/theme/app_theme.dart';
import '../../data/dashboard_models.dart';
import 'exam_countdown.dart';

/// Target-exam + countdown hero — mirrors dashboard/page.tsx:110-137 on web.
class HeroPanel extends ConsumerWidget {
  const HeroPanel({super.key, required this.data});

  final DashboardData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppGradients.hero,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppGradients.softShadow(AppColors.navy900),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            data.targetExamNameEn ?? 'Set a target exam',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
          ),
          const SizedBox(height: 4),
          const Text(
            'Every session brings you closer.',
            style: TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 18),
          if (data.examDate != null)
            ExamCountdown(examDate: data.examDate!)
          else if (data.examCountdownDays != null)
            Row(
              children: [
                Text(
                  '${data.examCountdownDays}',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 28),
                ),
                const SizedBox(width: 6),
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text('days left', style: TextStyle(color: Colors.white70)),
                ),
              ],
            )
          else
            const Text('No exam date set', style: TextStyle(color: Colors.white70)),
          const SizedBox(height: 16),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white54),
            ),
            onPressed: () => ref.read(homeTabIndexProvider.notifier).state = 3,
            child: const Text('View study plan'),
          ),
        ],
      ),
    );
  }
}
