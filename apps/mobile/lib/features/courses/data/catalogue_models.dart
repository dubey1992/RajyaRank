import '../../payments/data/payment_models.dart';

/// Hand-ported from `CourseListItem`/`toFilterableCourses` in
/// apps/web/lib/courses.ts and `GET /courses` in
/// apps/api/src/catalogue/catalogue.controller.ts — the same public,
/// unauthenticated catalogue row web's `/courses` page renders.
class PublicCourse {
  PublicCourse({
    required this.id,
    required this.code,
    required this.titleEn,
    required this.stateId,
    required this.examId,
    required this.orgId,
    required this.orgName,
    required this.createdAt,
    required this.avgRating,
    required this.ratingCount,
    required this.enrollmentCount,
  });

  factory PublicCourse.fromJson(Map<String, dynamic> json) {
    return PublicCourse(
      id: json['id'] as String,
      code: json['code'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      stateId: json['stateId'] as String?,
      examId: json['examId'] as String?,
      orgId: json['orgId'] as String?,
      orgName: json['orgName'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      avgRating: (json['avgRating'] as num?)?.toDouble() ?? 0,
      ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
      enrollmentCount: (json['enrollmentCount'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String code;
  final String titleEn;
  final String? stateId;
  final String? examId;
  final String? orgId;
  final String? orgName;
  final DateTime createdAt;
  final double avgRating;
  final int ratingCount;
  final int enrollmentCount;

  bool get isInstitute => orgId != null;
  bool get isNew => DateTime.now().difference(createdAt).inDays < 14;
}

/// A [PublicCourse] joined with its public [ProductView] pricing — mirrors
/// `toFilterableCourses()` (apps/web/lib/courses.ts), which drops any course
/// with no public product yet since there'd be nothing to buy.
class FilterableCourse {
  FilterableCourse({required this.course, required this.product});

  final PublicCourse course;
  final ProductView product;
}

class ExamRef {
  ExamRef({required this.id, required this.nameEn});

  factory ExamRef.fromJson(Map<String, dynamic> json) {
    return ExamRef(
      id: json['id'] as String,
      nameEn: json['nameEn'] as String? ?? '',
    );
  }

  final String id;
  final String nameEn;
}

class StateRef {
  StateRef({required this.id, required this.nameEn});

  factory StateRef.fromJson(Map<String, dynamic> json) {
    return StateRef(
      id: json['id'] as String,
      nameEn: json['nameEn'] as String? ?? '',
    );
  }

  final String id;
  final String nameEn;
}

/// Hand-ported from `CourseOutlineView` in packages/contracts/src/course.ts
/// — the public, pre-purchase syllabus. Lessons are flattened straight from
/// subject → lessons (skipping the chapter/topic nesting in the UI), the
/// same simplification web's `CourseSyllabus.tsx` makes.
class CourseOutlineLesson {
  CourseOutlineLesson({
    required this.id,
    required this.titleEn,
    required this.lessonType,
    required this.freePreview,
    required this.estimatedMinutes,
  });

  factory CourseOutlineLesson.fromJson(Map<String, dynamic> json) {
    return CourseOutlineLesson(
      id: json['id'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      lessonType: json['lessonType'] as String? ?? '',
      freePreview: json['freePreview'] as bool? ?? false,
      estimatedMinutes: (json['estimatedMinutes'] as num?)?.toInt(),
    );
  }

  final String id;
  final String titleEn;
  final String lessonType;
  final bool freePreview;
  final int? estimatedMinutes;
}

class CourseOutlineSubject {
  CourseOutlineSubject({required this.nameEn, required this.lessons});

  factory CourseOutlineSubject.fromJson(Map<String, dynamic> json) {
    final chapters = (json['chapters'] as List<dynamic>?) ?? const [];
    final lessons = <CourseOutlineLesson>[];
    for (final chapter in chapters.cast<Map<String, dynamic>>()) {
      final topics = (chapter['topics'] as List<dynamic>?) ?? const [];
      for (final topic in topics.cast<Map<String, dynamic>>()) {
        final topicLessons = (topic['lessons'] as List<dynamic>?) ?? const [];
        lessons.addAll(
          topicLessons
              .cast<Map<String, dynamic>>()
              .map(CourseOutlineLesson.fromJson),
        );
      }
    }
    return CourseOutlineSubject(
      nameEn: json['nameEn'] as String? ?? '',
      lessons: lessons,
    );
  }

  final String nameEn;
  final List<CourseOutlineLesson> lessons;
}

class CourseOutline {
  CourseOutline({
    required this.id,
    required this.titleEn,
    required this.descEn,
    required this.orgId,
    required this.orgName,
    required this.coursePromiseEn,
    required this.learningOutcomes,
    required this.subjects,
  });

  factory CourseOutline.fromJson(Map<String, dynamic> json) {
    final subjectsJson = (json['subjects'] as List<dynamic>?) ?? const [];
    final outcomesJson =
        (json['learningOutcomes'] as List<dynamic>?) ?? const [];
    return CourseOutline(
      id: json['id'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      descEn: json['descEn'] as String?,
      orgId: json['orgId'] as String?,
      orgName: json['orgName'] as String?,
      coursePromiseEn: json['coursePromiseEn'] as String?,
      learningOutcomes: outcomesJson.cast<String>(),
      subjects: subjectsJson
          .cast<Map<String, dynamic>>()
          .map(CourseOutlineSubject.fromJson)
          .toList(),
    );
  }

  final String id;
  final String titleEn;
  final String? descEn;
  final String? orgId;
  final String? orgName;
  final String? coursePromiseEn;
  final List<String> learningOutcomes;
  final List<CourseOutlineSubject> subjects;
}

class CourseRatingItem {
  CourseRatingItem({
    required this.userName,
    required this.rating,
    required this.comment,
    required this.createdAt,
  });

  factory CourseRatingItem.fromJson(Map<String, dynamic> json) {
    return CourseRatingItem(
      userName: json['userName'] as String? ?? '',
      rating: (json['rating'] as num?)?.toInt() ?? 0,
      comment: json['comment'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  final String userName;
  final int rating;
  final String? comment;
  final DateTime createdAt;
}

class CourseRatings {
  CourseRatings({
    required this.average,
    required this.count,
    required this.breakdown,
    required this.ratings,
  });

  factory CourseRatings.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? const {};
    final breakdownJson =
        summary['breakdown'] as Map<String, dynamic>? ?? const {};
    final ratingsJson = (json['ratings'] as List<dynamic>?) ?? const [];
    return CourseRatings(
      average: (summary['average'] as num?)?.toDouble() ?? 0,
      count: (summary['count'] as num?)?.toInt() ?? 0,
      breakdown: {
        for (final entry in breakdownJson.entries)
          int.parse(entry.key): (entry.value as num?)?.toInt() ?? 0,
      },
      ratings: ratingsJson
          .cast<Map<String, dynamic>>()
          .map(CourseRatingItem.fromJson)
          .toList(),
    );
  }

  final double average;
  final int count;
  final Map<int, int> breakdown;
  final List<CourseRatingItem> ratings;
}

class VerifyInstituteCodeResult {
  VerifyInstituteCodeResult({
    required this.valid,
    required this.orgName,
    required this.product,
  });

  factory VerifyInstituteCodeResult.fromJson(Map<String, dynamic> json) {
    final productJson = json['product'] as Map<String, dynamic>?;
    return VerifyInstituteCodeResult(
      valid: json['valid'] as bool? ?? false,
      orgName: json['orgName'] as String?,
      product: productJson == null ? null : ProductView.fromJson(productJson),
    );
  }

  final bool valid;
  final String? orgName;
  final ProductView? product;
}
