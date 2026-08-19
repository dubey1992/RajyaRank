class ExamResult {
  ExamResult({required this.id, required this.nameEn});

  factory ExamResult.fromJson(Map<String, dynamic> json) {
    return ExamResult(id: json['id'] as String, nameEn: json['nameEn'] as String? ?? '');
  }

  final String id;
  final String nameEn;
}

class CourseResult {
  CourseResult({required this.id, required this.titleEn});

  factory CourseResult.fromJson(Map<String, dynamic> json) {
    return CourseResult(
      id: json['id'] as String,
      titleEn: json['titleEn'] as String? ?? '',
    );
  }

  final String id;
  final String titleEn;
}

class SearchResults {
  SearchResults({required this.exams, required this.courses});

  factory SearchResults.fromJson(Map<String, dynamic> json) {
    final examsJson = (json['exams'] as List<dynamic>?) ?? const [];
    final coursesJson = (json['courses'] as List<dynamic>?) ?? const [];
    return SearchResults(
      exams: examsJson.cast<Map<String, dynamic>>().map(ExamResult.fromJson).toList(),
      courses: coursesJson
          .cast<Map<String, dynamic>>()
          .map(CourseResult.fromJson)
          .toList(),
    );
  }

  final List<ExamResult> exams;
  final List<CourseResult> courses;

  bool get isEmpty => exams.isEmpty && courses.isEmpty;
}
