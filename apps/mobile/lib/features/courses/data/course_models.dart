/// Hand-ported from `StudentCourseSummary`/`InstituteCourseSummary`/
/// `StudentCourseDetail` in packages/contracts/src/student.ts.
class StudentCourseSummary {
  StudentCourseSummary({
    required this.courseId,
    required this.titleEn,
    required this.lessonsTotal,
    required this.lessonsCompleted,
    required this.percentComplete,
    required this.validUntil,
  });

  factory StudentCourseSummary.fromJson(Map<String, dynamic> json) {
    final validUntil = json['validUntil'] as String?;
    return StudentCourseSummary(
      courseId: json['courseId'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      lessonsTotal: (json['lessonsTotal'] as num?)?.toInt() ?? 0,
      lessonsCompleted: (json['lessonsCompleted'] as num?)?.toInt() ?? 0,
      percentComplete: (json['percentComplete'] as num?)?.toInt() ?? 0,
      validUntil: validUntil == null ? null : DateTime.tryParse(validUntil),
    );
  }

  final String courseId;
  final String titleEn;
  final int lessonsTotal;
  final int lessonsCompleted;
  final int percentComplete;
  final DateTime? validUntil;
}

class InstituteCourseSummary {
  InstituteCourseSummary({
    required this.courseId,
    required this.titleEn,
    required this.entitled,
  });

  factory InstituteCourseSummary.fromJson(Map<String, dynamic> json) {
    return InstituteCourseSummary(
      courseId: json['courseId'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      entitled: json['entitled'] as bool? ?? false,
    );
  }

  final String courseId;
  final String titleEn;
  final bool entitled;
}

/// One of NONE / IN_PROGRESS / COMPLETED, as sent by the API.
enum LessonProgressStatus { none, inProgress, completed }

LessonProgressStatus _parseProgressStatus(String? raw) => switch (raw) {
  'COMPLETED' => LessonProgressStatus.completed,
  'IN_PROGRESS' => LessonProgressStatus.inProgress,
  _ => LessonProgressStatus.none,
};

class StudentCourseLesson {
  StudentCourseLesson({
    required this.lessonId,
    required this.titleEn,
    required this.lessonType,
    required this.freePreview,
    required this.status,
    required this.accessible,
  });

  factory StudentCourseLesson.fromJson(Map<String, dynamic> json) {
    return StudentCourseLesson(
      lessonId: json['lessonId'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      lessonType: json['lessonType'] as String? ?? '',
      freePreview: json['freePreview'] as bool? ?? false,
      status: _parseProgressStatus(json['status'] as String?),
      accessible: json['accessible'] as bool? ?? false,
    );
  }

  final String lessonId;
  final String titleEn;
  final String lessonType;
  final bool freePreview;
  final LessonProgressStatus status;
  final bool accessible;
}

class StudentCourseModule {
  StudentCourseModule({
    required this.subjectId,
    required this.nameEn,
    required this.lessons,
  });

  factory StudentCourseModule.fromJson(Map<String, dynamic> json) {
    final lessonsJson = (json['lessons'] as List<dynamic>?) ?? const [];
    return StudentCourseModule(
      subjectId: json['subjectId'] as String,
      nameEn: json['nameEn'] as String? ?? '',
      lessons: lessonsJson
          .cast<Map<String, dynamic>>()
          .map(StudentCourseLesson.fromJson)
          .toList(),
    );
  }

  final String subjectId;
  final String nameEn;
  final List<StudentCourseLesson> lessons;
}

class StudentCourseDetail {
  StudentCourseDetail({
    required this.courseId,
    required this.titleEn,
    required this.descEn,
    required this.lessonsTotal,
    required this.lessonsCompleted,
    required this.percentComplete,
    required this.modules,
  });

  factory StudentCourseDetail.fromJson(Map<String, dynamic> json) {
    final modulesJson = (json['modules'] as List<dynamic>?) ?? const [];
    return StudentCourseDetail(
      courseId: json['courseId'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      descEn: json['descEn'] as String?,
      lessonsTotal: (json['lessonsTotal'] as num?)?.toInt() ?? 0,
      lessonsCompleted: (json['lessonsCompleted'] as num?)?.toInt() ?? 0,
      percentComplete: (json['percentComplete'] as num?)?.toInt() ?? 0,
      modules: modulesJson
          .cast<Map<String, dynamic>>()
          .map(StudentCourseModule.fromJson)
          .toList(),
    );
  }

  final String courseId;
  final String titleEn;
  final String? descEn;
  final int lessonsTotal;
  final int lessonsCompleted;
  final int percentComplete;
  final List<StudentCourseModule> modules;

  /// Mirrors CourseProgressCard.tsx's resume-lesson pick: first IN_PROGRESS
  /// accessible lesson, else first accessible NONE lesson, else null.
  StudentCourseLesson? get resumeLesson {
    final all = modules.expand((m) => m.lessons);
    for (final lesson in all) {
      if (lesson.accessible &&
          lesson.status == LessonProgressStatus.inProgress) {
        return lesson;
      }
    }
    for (final lesson in all) {
      if (lesson.accessible && lesson.status == LessonProgressStatus.none) {
        return lesson;
      }
    }
    return null;
  }
}
