/// Mirrors GET /states (apps/api/src/catalogue/catalogue.controller.ts).
class StateOption {
  StateOption({required this.id, required this.nameEn});

  factory StateOption.fromJson(Map<String, dynamic> json) =>
      StateOption(id: json['id'] as String, nameEn: json['nameEn'] as String);

  final String id;
  final String nameEn;
}

/// Mirrors GET /exams — same list the admin exam dropdown and the public
/// exams page use.
class ExamOption {
  ExamOption({required this.id, required this.nameEn});

  factory ExamOption.fromJson(Map<String, dynamic> json) =>
      ExamOption(id: json['id'] as String, nameEn: json['nameEn'] as String);

  final String id;
  final String nameEn;
}

/// Matches `qualificationSchema` in packages/contracts/src/student.ts exactly
/// — these are the literal enum values the API expects on the wire.
enum Qualification { tenth, twelfth, graduate, postgraduate, technical }

extension QualificationLabel on Qualification {
  String get wireValue => switch (this) {
    Qualification.tenth => '10TH',
    Qualification.twelfth => '12TH',
    Qualification.graduate => 'GRADUATE',
    Qualification.postgraduate => 'POSTGRADUATE',
    Qualification.technical => 'TECHNICAL',
  };

  String get label => switch (this) {
    Qualification.tenth => '10th pass',
    Qualification.twelfth => '12th pass',
    Qualification.graduate => 'Graduate',
    Qualification.postgraduate => 'Postgraduate',
    Qualification.technical => 'Technical / diploma',
  };
}
