class LiveClass {
  LiveClass({
    required this.id,
    required this.courseTitleEn,
    required this.titleEn,
    required this.descriptionEn,
    required this.startsAt,
    required this.durationMinutes,
    required this.phase,
  });

  factory LiveClass.fromJson(Map<String, dynamic> json) {
    return LiveClass(
      id: json['id'] as String,
      courseTitleEn: json['courseTitleEn'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      descriptionEn: json['descriptionEn'] as String?,
      startsAt: DateTime.parse(json['startsAt'] as String),
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      phase: json['phase'] as String? ?? 'UPCOMING',
    );
  }

  final String id;
  final String courseTitleEn;
  final String titleEn;
  final String? descriptionEn;
  final DateTime startsAt;
  final int durationMinutes;
  final String phase;

  bool get isLiveNow => phase == 'LIVE_NOW';
  bool get hasEnded => phase == 'ENDED';

  /// Join opens 10 minutes before start — mirrors the server's own window
  /// check in LiveClassesService#join, so the button only enables when the
  /// call would actually succeed. The server's own /upcoming endpoint
  /// already excludes ended classes, but hasEnded is still checked here
  /// defensively rather than assuming that filtering can never change.
  bool get canJoin =>
      !hasEnded &&
      (isLiveNow ||
          DateTime.now().isAfter(
            startsAt.subtract(const Duration(minutes: 10)),
          ));
}
