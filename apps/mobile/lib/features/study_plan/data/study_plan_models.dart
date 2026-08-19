/// Hand-ported from `PlanItemView`/`StudyPlanDay` in
/// packages/contracts/src/student.ts.
enum PlanItemStatus { pending, done, skipped, missed, rescheduled }

PlanItemStatus _parseStatus(String? raw) => switch (raw) {
  'DONE' => PlanItemStatus.done,
  'SKIPPED' => PlanItemStatus.skipped,
  'MISSED' => PlanItemStatus.missed,
  'RESCHEDULED' => PlanItemStatus.rescheduled,
  _ => PlanItemStatus.pending,
};

enum PlanItemKind { lesson, weakTopicDrill, mistakeDrill, test, unknown }

PlanItemKind _parseKind(String? raw) => switch (raw) {
  'LESSON' => PlanItemKind.lesson,
  'WEAK_TOPIC_DRILL' => PlanItemKind.weakTopicDrill,
  'MISTAKE_DRILL' => PlanItemKind.mistakeDrill,
  'TEST' => PlanItemKind.test,
  _ => PlanItemKind.unknown,
};

class PlanItemView {
  PlanItemView({
    required this.id,
    required this.kind,
    required this.status,
    required this.titleEn,
    required this.lessonId,
    required this.estimatedMinutes,
    required this.freePreview,
  });

  factory PlanItemView.fromJson(Map<String, dynamic> json) {
    return PlanItemView(
      id: json['id'] as String,
      kind: _parseKind(json['kind'] as String?),
      status: _parseStatus(json['status'] as String?),
      titleEn: json['titleEn'] as String? ?? '',
      lessonId: json['lessonId'] as String?,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt() ?? 0,
      freePreview: json['freePreview'] as bool? ?? false,
    );
  }

  final String id;
  final PlanItemKind kind;
  final PlanItemStatus status;
  final String titleEn;
  final String? lessonId;
  final int estimatedMinutes;
  final bool freePreview;
}

class StudyPlanDay {
  StudyPlanDay({required this.date, required this.items});

  factory StudyPlanDay.fromJson(Map<String, dynamic> json) {
    final itemsJson = (json['items'] as List<dynamic>?) ?? const [];
    return StudyPlanDay(
      date: json['date'] as String,
      items: itemsJson
          .cast<Map<String, dynamic>>()
          .map(PlanItemView.fromJson)
          .toList(),
    );
  }

  final String date;
  final List<PlanItemView> items;
}
