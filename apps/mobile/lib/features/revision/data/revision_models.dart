/// Hand-ported from `WeakTopic` (packages/contracts/src/test.ts) and the
/// `/student/revision` response (student.service.ts revision()).
class WeakTopic {
  WeakTopic({
    required this.id,
    required this.kind,
    required this.nameEn,
    required this.accuracy,
  });

  factory WeakTopic.fromJson(Map<String, dynamic> json) {
    return WeakTopic(
      id: json['id'] as String,
      kind: json['kind'] as String? ?? 'topic',
      nameEn: json['nameEn'] as String? ?? '',
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
    );
  }

  final String id;
  final String kind;
  final String nameEn;
  final double accuracy;
}

class RevisionLessonRef {
  RevisionLessonRef({
    required this.lessonId,
    required this.titleEn,
    this.percentComplete,
  });

  factory RevisionLessonRef.fromJson(Map<String, dynamic> json) {
    return RevisionLessonRef(
      lessonId: json['lessonId'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      percentComplete: (json['percentComplete'] as num?)?.toInt(),
    );
  }

  final String lessonId;
  final String titleEn;
  final int? percentComplete;
}

class RevisionData {
  RevisionData({required this.bookmarked, required this.inProgress});

  factory RevisionData.fromJson(Map<String, dynamic> json) {
    final bookmarkedJson = (json['bookmarked'] as List<dynamic>?) ?? const [];
    final inProgressJson = (json['inProgress'] as List<dynamic>?) ?? const [];
    return RevisionData(
      bookmarked: bookmarkedJson
          .cast<Map<String, dynamic>>()
          .map(RevisionLessonRef.fromJson)
          .toList(),
      inProgress: inProgressJson
          .cast<Map<String, dynamic>>()
          .map(RevisionLessonRef.fromJson)
          .toList(),
    );
  }

  final List<RevisionLessonRef> bookmarked;
  final List<RevisionLessonRef> inProgress;
}
