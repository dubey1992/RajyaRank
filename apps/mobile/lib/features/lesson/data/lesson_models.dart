/// Hand-ported from `lessonDetail()`'s response shape and
/// `playbackTokenResponseSchema` in packages/contracts/src/student.ts.
class LessonProgressInfo {
  LessonProgressInfo({
    required this.status,
    required this.percentComplete,
    required this.videoPositionSeconds,
  });

  factory LessonProgressInfo.fromJson(Map<String, dynamic> json) {
    return LessonProgressInfo(
      status: json['status'] as String? ?? 'NONE',
      percentComplete: (json['percentComplete'] as num?)?.toInt() ?? 0,
      videoPositionSeconds:
          (json['videoPositionSeconds'] as num?)?.toInt() ?? 0,
    );
  }

  final String status;
  final int percentComplete;
  final int videoPositionSeconds;
}

class LessonDetail {
  LessonDetail({
    required this.lessonId,
    required this.lessonType,
    required this.freePreview,
    required this.titleEn,
    required this.summaryEn,
    required this.accessible,
    required this.progress,
    required this.bookmarked,
  });

  factory LessonDetail.fromJson(Map<String, dynamic> json) {
    final title = json['title'] as Map<String, dynamic>? ?? const {};
    final summary = json['summary'] as Map<String, dynamic>? ?? const {};
    final progressJson = json['progress'] as Map<String, dynamic>?;
    return LessonDetail(
      lessonId: json['lessonId'] as String,
      lessonType: json['lessonType'] as String? ?? '',
      freePreview: json['freePreview'] as bool? ?? false,
      titleEn: title['en'] as String? ?? '',
      summaryEn: summary['en'] as String?,
      accessible: json['accessible'] as bool? ?? false,
      progress: progressJson == null
          ? null
          : LessonProgressInfo.fromJson(progressJson),
      bookmarked: json['bookmarked'] as bool? ?? false,
    );
  }

  final String lessonId;
  final String lessonType;
  final bool freePreview;
  final String titleEn;
  final String? summaryEn;
  final bool accessible;
  final LessonProgressInfo? progress;
  final bool bookmarked;

  bool get isDocumentType => lessonType.toUpperCase() == 'PDF';
}

enum PlaybackKind { video, document, embed }

PlaybackKind _parseKind(String raw) => switch (raw) {
  'DOCUMENT' => PlaybackKind.document,
  'EMBED' => PlaybackKind.embed,
  _ => PlaybackKind.video,
};

class PlaybackToken {
  PlaybackToken({
    required this.url,
    required this.expiresInSeconds,
    required this.kind,
    required this.watermark,
  });

  factory PlaybackToken.fromJson(Map<String, dynamic> json) {
    return PlaybackToken(
      url: json['url'] as String,
      expiresInSeconds: (json['expiresInSeconds'] as num?)?.toInt() ?? 0,
      kind: _parseKind(json['kind'] as String? ?? 'VIDEO'),
      watermark: json['watermark'] as String?,
    );
  }

  final String url;
  final int expiresInSeconds;
  final PlaybackKind kind;
  final String? watermark;
}
