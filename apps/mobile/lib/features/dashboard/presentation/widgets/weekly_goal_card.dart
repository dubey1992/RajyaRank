import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/dashboard_models.dart';

/// Weekly study-goal ring + Lessons/Tests/Revise mini-stats — mirrors
/// dashboard/page.tsx:207-227 on web.
class WeeklyGoalCard extends StatelessWidget {
  const WeeklyGoalCard({
    super.key,
    required this.data,
    required this.weakTopicCount,
  });

  final DashboardData data;
  final int weakTopicCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Column(
        children: [
          const Align(
            alignment: Alignment.centerLeft,
            child: Text('Weekly goal', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: 110,
            height: 110,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 110,
                  height: 110,
                  child: CircularProgressIndicator(
                    value: data.weeklyGoalPercent,
                    strokeWidth: 10,
                    backgroundColor: AppColors.line,
                    color: AppColors.orange500,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${(data.weeklyGoalPercent * 100).round()}%',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
                    ),
                    Text(
                      '${data.weeklyGoalDoneMinutes}/${data.weeklyGoalTargetMinutes}m',
                      style: const TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _MiniStat(label: 'Lessons', value: '${data.lessonsCompleted}'),
              _MiniStat(label: 'Tests', value: '${data.testsAttempted}'),
              _MiniStat(label: 'Revise', value: '$weakTopicCount'),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 11)),
      ],
    );
  }
}
