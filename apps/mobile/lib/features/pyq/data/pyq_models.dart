class PyqPaper {
  PyqPaper({
    required this.id,
    required this.examNameEn,
    required this.titleEn,
    required this.year,
  });

  factory PyqPaper.fromJson(Map<String, dynamic> json) {
    return PyqPaper(
      id: json['id'] as String,
      examNameEn: json['examNameEn'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      year: (json['year'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String examNameEn;
  final String titleEn;
  final int year;
}
