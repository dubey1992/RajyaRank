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

enum PlanItemKind { lesson, weakTopicDrill, mistakeDrill, test, custom, unknown }

PlanItemKind _parseKind(String? raw) => switch (raw) {
  'LESSON' => PlanItemKind.lesson,
  'WEAK_TOPIC_DRILL' => PlanItemKind.weakTopicDrill,
  'MISTAKE_DRILL' => PlanItemKind.mistakeDrill,
  'TEST' => PlanItemKind.test,
  'CUSTOM' => PlanItemKind.custom,
  _ => PlanItemKind.unknown,
};

class PlanItemView {
  PlanItemView({
    required this.id,
    required this.kind,
    required this.status,
    required this.titleEn,
    required this.lessonId,
    required this.customTopicId,
    required this.noteText,
    required this.resourceUrl,
    required this.resourceLabel,
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
      customTopicId: json['customTopicId'] as String?,
      noteText: json['noteText'] as String?,
      resourceUrl: json['resourceUrl'] as String?,
      resourceLabel: json['resourceLabel'] as String?,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt() ?? 0,
      freePreview: json['freePreview'] as bool? ?? false,
    );
  }

  final String id;
  final PlanItemKind kind;
  final PlanItemStatus status;
  final String titleEn;
  final String? lessonId;
  final String? customTopicId;
  final String? noteText;
  final String? resourceUrl;
  final String? resourceLabel;
  final int estimatedMinutes;
  final bool freePreview;
}

/// Hand-ported from `CustomTopicView` in packages/contracts/src/student.ts.
class CustomTopicView {
  CustomTopicView({
    required this.id,
    required this.name,
    required this.moduleName,
    required this.noteText,
    required this.resourceUrl,
    required this.resourceLabel,
    required this.estimatedMinutes,
    required this.scheduled,
    required this.createdAt,
  });

  factory CustomTopicView.fromJson(Map<String, dynamic> json) {
    return CustomTopicView(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      moduleName: json['moduleName'] as String?,
      noteText: json['noteText'] as String?,
      resourceUrl: json['resourceUrl'] as String?,
      resourceLabel: json['resourceLabel'] as String?,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt() ?? 30,
      scheduled: json['scheduled'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  final String id;
  final String name;
  final String? moduleName;
  final String? noteText;
  final String? resourceUrl;
  final String? resourceLabel;
  final int estimatedMinutes;
  final bool scheduled;
  final String createdAt;
}

/// Hand-ported from `StudyPlanAccessStatus` — read to decide client-side
/// whether a new/edited CUSTOM topic action would hit `SUBSCRIPTION_REQUIRED`,
/// so the paywall can be shown proactively instead of only after a 409.
class StudyPlanAccessStatus {
  StudyPlanAccessStatus({
    required this.hasActiveSubscription,
    required this.freeTopicLimit,
    required this.customTopicCount,
  });

  factory StudyPlanAccessStatus.fromJson(Map<String, dynamic> json) {
    return StudyPlanAccessStatus(
      hasActiveSubscription: json['hasActiveSubscription'] as bool? ?? false,
      freeTopicLimit: (json['freeTopicLimit'] as num?)?.toInt() ?? 3,
      customTopicCount: (json['customTopicCount'] as num?)?.toInt() ?? 0,
    );
  }

  final bool hasActiveSubscription;
  final int freeTopicLimit;
  final int customTopicCount;

  bool get locked => !hasActiveSubscription && customTopicCount >= freeTopicLimit;
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
