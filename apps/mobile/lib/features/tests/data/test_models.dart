/// Hand-ported from packages/contracts/src/test.ts.
enum QuestionType {
  singleChoice,
  multipleChoice,
  trueFalse,
  numeric,
  match,
  passage,
  assertionReason,
  unknown,
}

QuestionType _parseQuestionType(String? raw) => switch (raw) {
  'SINGLE_CHOICE' => QuestionType.singleChoice,
  'MULTIPLE_CHOICE' => QuestionType.multipleChoice,
  'TRUE_FALSE' => QuestionType.trueFalse,
  'NUMERIC' => QuestionType.numeric,
  'MATCH' => QuestionType.match,
  'PASSAGE' => QuestionType.passage,
  'ASSERTION_REASON' => QuestionType.assertionReason,
  _ => QuestionType.unknown,
};

/// True for question types whose `response` on the wire is a single option
/// key string — SINGLE_CHOICE, TRUE_FALSE, PASSAGE and ASSERTION_REASON all
/// share this shape, so they share one radio-button UI.
bool isSingleKeyType(QuestionType type) =>
    type == QuestionType.singleChoice ||
    type == QuestionType.trueFalse ||
    type == QuestionType.passage ||
    type == QuestionType.assertionReason;

class StudentTestListItem {
  StudentTestListItem({
    required this.testVersionId,
    required this.titleEn,
    required this.type,
    required this.durationMinutes,
    required this.questionCount,
    required this.completedAttemptId,
    required this.accessible,
  });

  factory StudentTestListItem.fromJson(Map<String, dynamic> json) {
    return StudentTestListItem(
      testVersionId: json['testVersionId'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      type: json['type'] as String? ?? '',
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 0,
      questionCount: (json['questionCount'] as num?)?.toInt() ?? 0,
      completedAttemptId: json['completedAttemptId'] as String?,
      accessible: json['accessible'] as bool? ?? false,
    );
  }

  final String testVersionId;
  final String titleEn;
  final String type;
  final int durationMinutes;
  final int questionCount;
  final String? completedAttemptId;
  final bool accessible;
}

class QuestionOption {
  QuestionOption({required this.key, required this.en});

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      key: json['key'] as String,
      en: json['en'] as String? ?? json['hi'] as String? ?? '',
    );
  }

  final String key;
  final String en;
}

class AttemptQuestion {
  AttemptQuestion({
    required this.questionVersionId,
    required this.type,
    required this.textEn,
    required this.options,
    required this.marks,
    required this.negativeMarks,
  });

  factory AttemptQuestion.fromJson(Map<String, dynamic> json) {
    final optionsJson = (json['options'] as List<dynamic>?) ?? const [];
    return AttemptQuestion(
      questionVersionId: json['questionVersionId'] as String,
      type: _parseQuestionType(json['type'] as String?),
      textEn: json['textEn'] as String? ?? json['textHi'] as String? ?? '',
      options: optionsJson
          .cast<Map<String, dynamic>>()
          .map(QuestionOption.fromJson)
          .toList(),
      marks: (json['marks'] as num?)?.toDouble() ?? 1,
      negativeMarks: (json['negativeMarks'] as num?)?.toDouble() ?? 0,
    );
  }

  final String questionVersionId;
  final QuestionType type;
  final String textEn;
  final List<QuestionOption> options;
  final double marks;
  final double negativeMarks;
}

class AttemptSection {
  AttemptSection({required this.nameEn, required this.questions});

  factory AttemptSection.fromJson(Map<String, dynamic> json) {
    final questionsJson = (json['questions'] as List<dynamic>?) ?? const [];
    return AttemptSection(
      nameEn: json['nameEn'] as String? ?? json['nameHi'] as String? ?? '',
      questions: questionsJson
          .cast<Map<String, dynamic>>()
          .map(AttemptQuestion.fromJson)
          .toList(),
    );
  }

  final String nameEn;
  final List<AttemptQuestion> questions;
}

class StartAttemptResponse {
  StartAttemptResponse({
    required this.attemptId,
    required this.expiresAt,
    required this.durationMinutes,
    required this.sections,
  });

  factory StartAttemptResponse.fromJson(Map<String, dynamic> json) {
    final sectionsJson = (json['sections'] as List<dynamic>?) ?? const [];
    return StartAttemptResponse(
      attemptId: json['attemptId'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 0,
      sections: sectionsJson
          .cast<Map<String, dynamic>>()
          .map(AttemptSection.fromJson)
          .toList(),
    );
  }

  final String attemptId;
  final DateTime expiresAt;
  final int durationMinutes;
  final List<AttemptSection> sections;
}

class SubjectAnalysis {
  SubjectAnalysis({
    required this.subject,
    required this.correct,
    required this.total,
  });

  factory SubjectAnalysis.fromJson(Map<String, dynamic> json) {
    return SubjectAnalysis(
      subject: json['subject'] as String? ?? '',
      correct: (json['correct'] as num?)?.toInt() ?? 0,
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }

  final String subject;
  final int correct;
  final int total;
}

class ResultQuestion {
  ResultQuestion({
    required this.questionVersionId,
    required this.type,
    required this.textEn,
    required this.options,
    required this.response,
    required this.isCorrect,
    required this.awarded,
    required this.correctAnswer,
    required this.explanationEn,
    required this.mistakeType,
  });

  factory ResultQuestion.fromJson(Map<String, dynamic> json) {
    final optionsJson = (json['options'] as List<dynamic>?) ?? const [];
    return ResultQuestion(
      questionVersionId: json['questionVersionId'] as String,
      type: _parseQuestionType(json['type'] as String?),
      textEn: json['textEn'] as String? ?? json['textHi'] as String? ?? '',
      options: optionsJson
          .cast<Map<String, dynamic>>()
          .map(QuestionOption.fromJson)
          .toList(),
      response: json['response'],
      isCorrect: json['isCorrect'] as bool?,
      awarded: (json['awarded'] as num?)?.toDouble(),
      correctAnswer: json['correctAnswer'],
      explanationEn:
          json['explanationEn'] as String? ?? json['explanationHi'] as String?,
      mistakeType: json['mistakeType'] as String?,
    );
  }

  final String questionVersionId;
  final QuestionType type;
  final String textEn;
  final List<QuestionOption> options;
  final Object? response;
  final bool? isCorrect;
  final double? awarded;
  final Object? correctAnswer;
  final String? explanationEn;
  final String? mistakeType;

  /// Normalizes both scalar (`"B"`) and array (`["A","C"]`) response/
  /// correct-answer shapes into a key set, for highlighting options.
  static Set<String> asKeySet(Object? value) {
    if (value == null) return const {};
    if (value is List) return value.map((e) => e.toString()).toSet();
    return {value.toString()};
  }
}

class AttemptResult {
  AttemptResult({
    required this.status,
    required this.score,
    required this.maxScore,
    required this.correctCount,
    required this.incorrectCount,
    required this.unansweredCount,
    required this.accuracy,
    required this.released,
    required this.passingScore,
    required this.passed,
    required this.rank,
    required this.percentile,
    required this.totalAttempts,
    required this.subjectAnalysis,
    required this.questions,
  });

  factory AttemptResult.fromJson(Map<String, dynamic> json) {
    final subjectJson =
        (json['subjectAnalysis'] as List<dynamic>?) ?? const [];
    final questionsJson = json['questions'] as List<dynamic>?;
    return AttemptResult(
      status: json['status'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0,
      maxScore: (json['maxScore'] as num?)?.toDouble() ?? 0,
      correctCount: (json['correctCount'] as num?)?.toInt() ?? 0,
      incorrectCount: (json['incorrectCount'] as num?)?.toInt() ?? 0,
      unansweredCount: (json['unansweredCount'] as num?)?.toInt() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toInt() ?? 0,
      released: json['released'] as bool? ?? false,
      passingScore: (json['passingScore'] as num?)?.toDouble(),
      passed: json['passed'] as bool?,
      rank: (json['rank'] as num?)?.toInt(),
      percentile: (json['percentile'] as num?)?.toDouble(),
      totalAttempts: (json['totalAttempts'] as num?)?.toInt() ?? 0,
      subjectAnalysis: subjectJson
          .cast<Map<String, dynamic>>()
          .map(SubjectAnalysis.fromJson)
          .toList(),
      questions: questionsJson
          ?.cast<Map<String, dynamic>>()
          .map(ResultQuestion.fromJson)
          .toList(),
    );
  }

  final String status;
  final double score;
  final double maxScore;
  final int correctCount;
  final int incorrectCount;
  final int unansweredCount;
  final int accuracy;
  final bool released;
  final double? passingScore;
  final bool? passed;
  final int? rank;
  final double? percentile;
  final int totalAttempts;
  final List<SubjectAnalysis> subjectAnalysis;
  final List<ResultQuestion>? questions;
}
