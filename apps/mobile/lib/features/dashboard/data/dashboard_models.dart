/// Hand-ported from `DashboardResponse` in packages/contracts/src/student.ts
/// — that Zod/TS file remains the source of truth; keep this in sync by hand
/// until a codegen pass is worth setting up.
class DashboardData {
  DashboardData({
    required this.greetingName,
    required this.targetExamNameEn,
    required this.examCountdownDays,
    required this.studyStreakDays,
    required this.studyTimeMinutes,
    required this.avgTestScorePercent,
    required this.testsAttempted,
    required this.coursePercent,
    required this.lessonsCompleted,
    required this.lessonsTotal,
    required this.onboarded,
    required this.hasActivePlan,
    required this.todayPlan,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final targetExam = json['targetExam'] as Map<String, dynamic>?;
    final stats = json['stats'] as Map<String, dynamic>? ?? const {};
    final todayPlanJson = (json['todayPlan'] as List<dynamic>?) ?? const [];
    return DashboardData(
      greetingName: json['greetingName'] as String?,
      targetExamNameEn: targetExam?['nameEn'] as String?,
      examCountdownDays: json['examCountdownDays'] as int?,
      studyStreakDays: (json['studyStreakDays'] as num?)?.toInt() ?? 0,
      studyTimeMinutes: (json['studyTimeMinutes'] as num?)?.toInt() ?? 0,
      avgTestScorePercent: (json['avgTestScorePercent'] as num?)?.toInt(),
      testsAttempted: (json['testsAttempted'] as num?)?.toInt() ?? 0,
      coursePercent: (stats['coursePercent'] as num?)?.toInt() ?? 0,
      lessonsCompleted: (stats['lessonsCompleted'] as num?)?.toInt() ?? 0,
      lessonsTotal: (stats['lessonsTotal'] as num?)?.toInt() ?? 0,
      onboarded: json['onboarded'] as bool? ?? true,
      hasActivePlan: json['hasActivePlan'] as bool? ?? false,
      todayPlan: todayPlanJson
          .cast<Map<String, dynamic>>()
          .map((item) => TodayPlanItem(
                titleEn: item['titleEn'] as String? ?? '',
                kind: item['kind'] as String? ?? '',
              ))
          .toList(),
    );
  }

  final String? greetingName;
  final String? targetExamNameEn;
  final int? examCountdownDays;
  final int studyStreakDays;
  final int studyTimeMinutes;
  final int? avgTestScorePercent;
  final int testsAttempted;
  final int coursePercent;
  final int lessonsCompleted;
  final int lessonsTotal;
  final bool onboarded;
  final bool hasActivePlan;
  final List<TodayPlanItem> todayPlan;
}

class TodayPlanItem {
  TodayPlanItem({required this.titleEn, required this.kind});

  final String titleEn;
  final String kind;
}
