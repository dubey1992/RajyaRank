/// Hand-ported from `DashboardResponse` in packages/contracts/src/student.ts
/// — that Zod/TS file remains the source of truth; keep this in sync by hand
/// until a codegen pass is worth setting up.
class DashboardData {
  DashboardData({
    required this.greetingName,
    required this.targetExamNameEn,
    required this.examCountdownDays,
    required this.examDate,
    required this.studyStreakDays,
    required this.streakWeek,
    required this.studyTimeMinutes,
    required this.avgTestScorePercent,
    required this.testsAttempted,
    required this.weeklyGoalTargetMinutes,
    required this.weeklyGoalDoneMinutes,
    required this.coursePercent,
    required this.lessonsCompleted,
    required this.lessonsTotal,
    required this.onboarded,
    required this.hasActivePlan,
    required this.todayPlan,
    required this.continueWatching,
  });

  factory DashboardData.fromJson(Map<String, dynamic> json) {
    final targetExam = json['targetExam'] as Map<String, dynamic>?;
    final stats = json['stats'] as Map<String, dynamic>? ?? const {};
    final weeklyGoal = json['weeklyGoal'] as Map<String, dynamic>? ?? const {};
    final todayPlanJson = (json['todayPlan'] as List<dynamic>?) ?? const [];
    final continueWatchingJson =
        (json['continueWatching'] as List<dynamic>?) ?? const [];
    final streakWeekJson = (json['streakWeek'] as List<dynamic>?) ?? const [];
    final examDateRaw = json['examDate'] as String?;
    return DashboardData(
      greetingName: json['greetingName'] as String?,
      targetExamNameEn: targetExam?['nameEn'] as String?,
      examCountdownDays: json['examCountdownDays'] as int?,
      examDate: examDateRaw == null ? null : DateTime.tryParse(examDateRaw),
      studyStreakDays: (json['studyStreakDays'] as num?)?.toInt() ?? 0,
      streakWeek: streakWeekJson.cast<bool>(),
      studyTimeMinutes: (json['studyTimeMinutes'] as num?)?.toInt() ?? 0,
      avgTestScorePercent: (json['avgTestScorePercent'] as num?)?.toInt(),
      testsAttempted: (json['testsAttempted'] as num?)?.toInt() ?? 0,
      weeklyGoalTargetMinutes:
          (weeklyGoal['targetMinutes'] as num?)?.toInt() ?? 0,
      weeklyGoalDoneMinutes: (weeklyGoal['doneMinutes'] as num?)?.toInt() ?? 0,
      coursePercent: (stats['coursePercent'] as num?)?.toInt() ?? 0,
      lessonsCompleted: (stats['lessonsCompleted'] as num?)?.toInt() ?? 0,
      lessonsTotal: (stats['lessonsTotal'] as num?)?.toInt() ?? 0,
      onboarded: json['onboarded'] as bool? ?? true,
      hasActivePlan: json['hasActivePlan'] as bool? ?? false,
      todayPlan: todayPlanJson
          .cast<Map<String, dynamic>>()
          .map(
            (item) => TodayPlanItem(
              lessonId: item['lessonId'] as String?,
              titleEn: item['titleEn'] as String? ?? '',
              kind: item['kind'] as String? ?? '',
              freePreview: item['freePreview'] as bool? ?? false,
            ),
          )
          .toList(),
      continueWatching: continueWatchingJson
          .cast<Map<String, dynamic>>()
          .map(
            (item) => ContinueWatchingItem(
              lessonId: item['lessonId'] as String? ?? '',
              titleEn: item['titleEn'] as String? ?? '',
              percentComplete: (item['percentComplete'] as num?)?.toInt() ?? 0,
            ),
          )
          .toList(),
    );
  }

  final String? greetingName;
  final String? targetExamNameEn;
  final int? examCountdownDays;
  final DateTime? examDate;
  final int studyStreakDays;
  /// Last 7 days, oldest first (index 6 = today) — see `DashboardResponse`.
  final List<bool> streakWeek;
  final int studyTimeMinutes;
  final int? avgTestScorePercent;
  final int testsAttempted;
  final int weeklyGoalTargetMinutes;
  final int weeklyGoalDoneMinutes;
  final int coursePercent;
  final int lessonsCompleted;
  final int lessonsTotal;
  final bool onboarded;
  final bool hasActivePlan;
  final List<TodayPlanItem> todayPlan;
  final List<ContinueWatchingItem> continueWatching;

  double get weeklyGoalPercent => weeklyGoalTargetMinutes == 0
      ? 0
      : (weeklyGoalDoneMinutes / weeklyGoalTargetMinutes).clamp(0, 1);

  /// Mirrors web's `resumeLesson` pick (dashboard/page.tsx:49): the most
  /// recent in-progress lesson, else the first item in today's plan.
  String? get resumeLessonId {
    if (continueWatching.isNotEmpty) return continueWatching.first.lessonId;
    if (todayPlan.isNotEmpty) return todayPlan.first.lessonId;
    return null;
  }
}

class TodayPlanItem {
  TodayPlanItem({
    required this.lessonId,
    required this.titleEn,
    required this.kind,
    required this.freePreview,
  });

  final String? lessonId;
  final String titleEn;
  final String kind;
  final bool freePreview;
}

class ContinueWatchingItem {
  ContinueWatchingItem({
    required this.lessonId,
    required this.titleEn,
    required this.percentComplete,
  });

  final String lessonId;
  final String titleEn;
  final int percentComplete;
}

/// Hand-ported from `ReadinessView`/`ReadinessBreakdown` in
/// packages/contracts/src/concepts.ts.
class ReadinessData {
  ReadinessData({
    required this.available,
    required this.score,
    required this.breakdown,
    required this.reason,
  });

  factory ReadinessData.fromJson(Map<String, dynamic> json) {
    final available = json['available'] as bool? ?? false;
    final breakdownJson = json['breakdown'] as Map<String, dynamic>?;
    return ReadinessData(
      available: available,
      score: (json['score'] as num?)?.toInt() ?? 0,
      breakdown: breakdownJson == null
          ? null
          : ReadinessBreakdown(
              conceptMastery: (breakdownJson['conceptMastery'] as num?)?.toInt() ?? 0,
              syllabusCoverage: (breakdownJson['syllabusCoverage'] as num?)?.toInt() ?? 0,
              revisionRetention: (breakdownJson['revisionRetention'] as num?)?.toInt() ?? 0,
              testEfficiency: (breakdownJson['testEfficiency'] as num?)?.toInt() ?? 0,
              consistency: (breakdownJson['consistency'] as num?)?.toInt() ?? 0,
            ),
      reason: json['reason'] as String?,
    );
  }

  final bool available;
  final int score;
  final ReadinessBreakdown? breakdown;
  final String? reason;
}

class ReadinessBreakdown {
  ReadinessBreakdown({
    required this.conceptMastery,
    required this.syllabusCoverage,
    required this.revisionRetention,
    required this.testEfficiency,
    required this.consistency,
  });

  final int conceptMastery;
  final int syllabusCoverage;
  final int revisionRetention;
  final int testEfficiency;
  final int consistency;
}

/// Hand-ported from `MistakeDnaView` in packages/contracts/src/test.ts.
class MistakeDnaData {
  MistakeDnaData({
    required this.available,
    required this.windowDays,
    required this.totalWrong,
    required this.byType,
  });

  factory MistakeDnaData.fromJson(Map<String, dynamic> json) {
    final byTypeJson = (json['byType'] as List<dynamic>?) ?? const [];
    return MistakeDnaData(
      available: json['available'] as bool? ?? false,
      windowDays: (json['windowDays'] as num?)?.toInt() ?? 0,
      totalWrong: (json['totalWrong'] as num?)?.toInt() ?? 0,
      byType: byTypeJson
          .cast<Map<String, dynamic>>()
          .map(
            (item) => MistakeTypeCount(
              type: item['type'] as String? ?? '',
              count: (item['count'] as num?)?.toInt() ?? 0,
              percent: (item['percent'] as num?)?.toInt() ?? 0,
            ),
          )
          .toList(),
    );
  }

  final bool available;
  final int windowDays;
  final int totalWrong;
  final List<MistakeTypeCount> byType;
}

class MistakeTypeCount {
  MistakeTypeCount({
    required this.type,
    required this.count,
    required this.percent,
  });

  final String type;
  final int count;
  final int percent;

  String get label => switch (type) {
    'CONCEPT_GAP' => 'Concept gap',
    'SLOW_CALCULATION' => 'Slow calculation',
    'GUESSING' => 'Guessing',
    'MISREAD' => 'Misread question',
    _ => type,
  };
}

/// Hand-ported from `WeakTopic` in packages/contracts/src/test.ts.
class WeakTopic {
  WeakTopic({
    required this.nameEn,
    required this.correct,
    required this.total,
    required this.accuracy,
  });

  factory WeakTopic.fromJson(Map<String, dynamic> json) {
    return WeakTopic(
      nameEn: json['nameEn'] as String? ?? '',
      correct: (json['correct'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toInt() ?? 0,
    );
  }

  final String nameEn;
  final int correct;
  final int total;
  final int accuracy;
}

/// Just enough of `PlanItemView` (packages/contracts/src/student.ts) to drive
/// the Mistake Coach preview — mirrors dashboard/page.tsx:40-43's client-side
/// filter of this week's plan for pending MISTAKE_DRILL items.
class WeekPlanItem {
  WeekPlanItem({
    required this.date,
    required this.kind,
    required this.status,
    required this.titleEn,
    required this.triggerMistakeType,
    required this.estimatedMinutes,
  });

  factory WeekPlanItem.fromJson(String date, Map<String, dynamic> json) {
    return WeekPlanItem(
      date: date,
      kind: json['kind'] as String? ?? '',
      status: json['status'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      triggerMistakeType: json['triggerMistakeType'] as String?,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt() ?? 0,
    );
  }

  final String date;
  final String kind;
  final String status;
  final String titleEn;
  final String? triggerMistakeType;
  final int estimatedMinutes;

  bool get isPendingMistakeDrill => kind == 'MISTAKE_DRILL' && status == 'PENDING';
}
