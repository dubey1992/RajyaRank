import '../../tests/data/test_models.dart' show QuestionType;

export '../../tests/data/test_models.dart' show QuestionType, isSingleKeyType;

/// `_parseQuestionType` in test_models.dart is library-private, so this is a
/// separate (but identical) wire-string mapping onto the SAME shared enum —
/// avoids duplicating the enum itself, which is the part worth sharing.
QuestionType parseQuestionType(String? raw) => switch (raw) {
  'SINGLE_CHOICE' => QuestionType.singleChoice,
  'MULTIPLE_CHOICE' => QuestionType.multipleChoice,
  'TRUE_FALSE' => QuestionType.trueFalse,
  'NUMERIC' => QuestionType.numeric,
  'MATCH' => QuestionType.match,
  'PASSAGE' => QuestionType.passage,
  'ASSERTION_REASON' => QuestionType.assertionReason,
  _ => QuestionType.unknown,
};

String questionTypeWire(QuestionType type) => switch (type) {
  QuestionType.singleChoice => 'SINGLE_CHOICE',
  QuestionType.multipleChoice => 'MULTIPLE_CHOICE',
  QuestionType.trueFalse => 'TRUE_FALSE',
  QuestionType.numeric => 'NUMERIC',
  QuestionType.match => 'MATCH',
  QuestionType.passage => 'PASSAGE',
  QuestionType.assertionReason => 'ASSERTION_REASON',
  QuestionType.unknown => 'SINGLE_CHOICE',
};

class PersonalQuizOption {
  PersonalQuizOption({required this.key, required this.text});

  factory PersonalQuizOption.fromJson(Map<String, dynamic> json) {
    return PersonalQuizOption(key: json['key'] as String, text: json['text'] as String? ?? '');
  }

  Map<String, dynamic> toJson() => {'key': key, 'text': text};

  final String key;
  final String text;
}

/// Hand-ported from `PersonalQuizView` in packages/contracts/src/personal-quizzes.ts.
class PersonalQuizView {
  PersonalQuizView({
    required this.id,
    required this.title,
    required this.customTopicId,
    required this.questionCount,
    required this.bestScore,
    required this.createdAt,
  });

  factory PersonalQuizView.fromJson(Map<String, dynamic> json) {
    return PersonalQuizView(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      customTopicId: json['customTopicId'] as String?,
      questionCount: (json['questionCount'] as num?)?.toInt() ?? 0,
      bestScore: (json['bestScore'] as num?)?.toDouble(),
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  final String id;
  final String title;
  final String? customTopicId;
  final int questionCount;
  final double? bestScore;
  final String createdAt;
}

/// Editor-only view — includes `correctAnswer`/`explanation` (the owner's
/// own quiz, never shown while a take-attempt is in progress).
class PersonalQuizQuestionEditView {
  PersonalQuizQuestionEditView({
    required this.id,
    required this.type,
    required this.text,
    required this.options,
    required this.sequence,
    required this.generatedByAi,
    required this.correctAnswer,
    required this.explanation,
  });

  factory PersonalQuizQuestionEditView.fromJson(Map<String, dynamic> json) {
    return PersonalQuizQuestionEditView(
      id: json['id'] as String,
      type: parseQuestionType(json['type'] as String?),
      text: json['text'] as String? ?? '',
      options: ((json['options'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(PersonalQuizOption.fromJson)
          .toList(),
      sequence: (json['sequence'] as num?)?.toInt() ?? 0,
      generatedByAi: json['generatedByAi'] as bool? ?? false,
      correctAnswer: json['correctAnswer'],
      explanation: json['explanation'] as String?,
    );
  }

  final String id;
  final QuestionType type;
  final String text;
  final List<PersonalQuizOption> options;
  final int sequence;
  final bool generatedByAi;
  final dynamic correctAnswer;
  final String? explanation;
}

class PersonalQuizDetail extends PersonalQuizView {
  PersonalQuizDetail({
    required super.id,
    required super.title,
    required super.customTopicId,
    required super.questionCount,
    required super.bestScore,
    required super.createdAt,
    required this.questions,
  });

  factory PersonalQuizDetail.fromJson(Map<String, dynamic> json) {
    final view = PersonalQuizView.fromJson(json);
    return PersonalQuizDetail(
      id: view.id,
      title: view.title,
      customTopicId: view.customTopicId,
      questionCount: view.questionCount,
      bestScore: view.bestScore,
      createdAt: view.createdAt,
      questions: ((json['questions'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(PersonalQuizQuestionEditView.fromJson)
          .toList(),
    );
  }

  final List<PersonalQuizQuestionEditView> questions;
}

/// Take-attempt view — `correctAnswer`/`explanation` deliberately stripped
/// server-side, same shape as the editor view minus those two fields.
class TakeQuestion {
  TakeQuestion({
    required this.id,
    required this.type,
    required this.text,
    required this.options,
    required this.sequence,
  });

  factory TakeQuestion.fromJson(Map<String, dynamic> json) {
    return TakeQuestion(
      id: json['id'] as String,
      type: parseQuestionType(json['type'] as String?),
      text: json['text'] as String? ?? '',
      options: ((json['options'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(PersonalQuizOption.fromJson)
          .toList(),
      sequence: (json['sequence'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final QuestionType type;
  final String text;
  final List<PersonalQuizOption> options;
  final int sequence;
}

class StartAttemptResponse {
  StartAttemptResponse({required this.attemptId, required this.questions});

  factory StartAttemptResponse.fromJson(Map<String, dynamic> json) {
    return StartAttemptResponse(
      attemptId: json['attemptId'] as String,
      questions: ((json['questions'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(TakeQuestion.fromJson)
          .toList(),
    );
  }

  final String attemptId;
  final List<TakeQuestion> questions;
}

class QuestionBreakdown {
  QuestionBreakdown({required this.questionId, required this.correct, required this.explanation});

  factory QuestionBreakdown.fromJson(Map<String, dynamic> json) {
    return QuestionBreakdown(
      questionId: json['questionId'] as String,
      correct: json['correct'] as bool? ?? false,
      explanation: json['explanation'] as String?,
    );
  }

  final String questionId;
  final bool correct;
  final String? explanation;
}

class PersonalQuizAttemptResult {
  PersonalQuizAttemptResult({
    required this.score,
    required this.maxScore,
    required this.breakdown,
    required this.revisionScheduledFor,
  });

  factory PersonalQuizAttemptResult.fromJson(Map<String, dynamic> json) {
    return PersonalQuizAttemptResult(
      score: (json['score'] as num?)?.toInt() ?? 0,
      maxScore: (json['maxScore'] as num?)?.toInt() ?? 0,
      breakdown: ((json['breakdown'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(QuestionBreakdown.fromJson)
          .toList(),
      revisionScheduledFor: json['revisionScheduledFor'] as String?,
    );
  }

  final int score;
  final int maxScore;
  final List<QuestionBreakdown> breakdown;
  final String? revisionScheduledFor;
}

class BulkImportError {
  BulkImportError({required this.block, required this.message});

  factory BulkImportError.fromJson(Map<String, dynamic> json) {
    return BulkImportError(block: (json['block'] as num?)?.toInt() ?? 0, message: json['message'] as String? ?? '');
  }

  final int block;
  final String message;
}

class BulkImportResult {
  BulkImportResult({required this.imported, required this.errors});

  factory BulkImportResult.fromJson(Map<String, dynamic> json) {
    return BulkImportResult(
      imported: (json['imported'] as num?)?.toInt() ?? 0,
      errors: ((json['errors'] as List?) ?? const [])
          .cast<Map<String, dynamic>>()
          .map(BulkImportError.fromJson)
          .toList(),
    );
  }

  final int imported;
  final List<BulkImportError> errors;
}
