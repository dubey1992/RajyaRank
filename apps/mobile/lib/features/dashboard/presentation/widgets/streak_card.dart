import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

const _weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/// 7-day activity grid — mirrors dashboard/page.tsx:230-248 on web.
/// [streakWeek] is oldest-first with index 6 = today, matching
/// `DashboardResponse.streakWeek`'s doc comment.
class StreakCard extends StatelessWidget {
  const StreakCard({
    super.key,
    required this.studyStreakDays,
    required this.streakWeek,
  });

  final int studyStreakDays;
  final List<bool> streakWeek;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppGradients.orange,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppGradients.softShadow(AppColors.orange500),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.local_fire_department_rounded, color: Colors.white),
              const SizedBox(width: 8),
              Text(
                '$studyStreakDays-day streak',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (i) {
              final active = i < streakWeek.length ? streakWeek[i] : false;
              final isToday = i == 6;
              return Column(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: active ? Colors.white : Colors.white24,
                      border: isToday ? Border.all(color: Colors.white, width: 2) : null,
                    ),
                    child: active
                        ? const Icon(Icons.local_fire_department_rounded, size: 14, color: AppColors.orange600)
                        : null,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _weekdayLabels[now.subtract(Duration(days: 6 - i)).weekday - 1],
                    style: const TextStyle(color: Colors.white70, fontSize: 10),
                  ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}
