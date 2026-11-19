/// Hand-ported from `StudentPaperView`/`StudentPaperDetail` in
/// packages/contracts/src/student-papers.ts.
class StudentPaperView {
  StudentPaperView({
    required this.id,
    required this.title,
    required this.year,
    required this.questionCount,
    required this.hasAnswerKey,
    required this.assetId,
    required this.bestScore,
    required this.createdAt,
  });

  factory StudentPaperView.fromJson(Map<String, dynamic> json) {
    return StudentPaperView(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      year: (json['year'] as num?)?.toInt(),
      questionCount: (json['questionCount'] as num?)?.toInt(),
      hasAnswerKey: json['hasAnswerKey'] as bool? ?? false,
      assetId: json['assetId'] as String,
      bestScore: (json['bestScore'] as num?)?.toDouble(),
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  final String id;
  final String title;
  final int? year;
  final int? questionCount;
  final bool hasAnswerKey;
  final String assetId;
  final double? bestScore;
  final String createdAt;
}

class UploadIntentResponse {
  UploadIntentResponse({
    required this.assetId,
    required this.uploadUrl,
    required this.storageKey,
    required this.expiresInSeconds,
  });

  factory UploadIntentResponse.fromJson(Map<String, dynamic> json) {
    return UploadIntentResponse(
      assetId: json['assetId'] as String,
      uploadUrl: json['uploadUrl'] as String,
      storageKey: json['storageKey'] as String? ?? '',
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
    );
  }

  final String assetId;
  final String uploadUrl;
  final String storageKey;
  final int expiresInSeconds;
}

class StudentPaperAttemptStart {
  StudentPaperAttemptStart({required this.attemptId, required this.assetId, required this.questionCount});

  factory StudentPaperAttemptStart.fromJson(Map<String, dynamic> json) {
    return StudentPaperAttemptStart(
      attemptId: json['attemptId'] as String,
      assetId: json['assetId'] as String,
      questionCount: (json['questionCount'] as num?)?.toInt() ?? 0,
    );
  }

  final String attemptId;
  final String assetId;
  final int questionCount;
}

/// `score`/`maxScore` are both nullable, and `null` means "no answer key —
/// submitted for manual review", distinct from a real score of 0.
class StudentPaperAttemptResult {
  StudentPaperAttemptResult({required this.score, required this.maxScore, required this.submittedAt});

  factory StudentPaperAttemptResult.fromJson(Map<String, dynamic> json) {
    return StudentPaperAttemptResult(
      score: (json['score'] as num?)?.toInt(),
      maxScore: (json['maxScore'] as num?)?.toInt(),
      submittedAt: json['submittedAt'] as String? ?? '',
    );
  }

  final int? score;
  final int? maxScore;
  final String submittedAt;
}
