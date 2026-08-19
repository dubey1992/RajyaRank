class DoubtReply {
  DoubtReply({required this.bodyText, required this.createdAt});

  factory DoubtReply.fromJson(Map<String, dynamic> json) {
    return DoubtReply(
      bodyText: json['bodyText'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  final String bodyText;
  final DateTime createdAt;
}

class DoubtView {
  DoubtView({
    required this.id,
    required this.bodyText,
    required this.status,
    required this.createdAt,
    required this.replies,
  });

  factory DoubtView.fromJson(Map<String, dynamic> json) {
    final repliesJson = (json['replies'] as List<dynamic>?) ?? const [];
    return DoubtView(
      id: json['id'] as String,
      bodyText: json['bodyText'] as String? ?? '',
      status: json['status'] as String? ?? 'OPEN',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      replies: repliesJson
          .cast<Map<String, dynamic>>()
          .map(DoubtReply.fromJson)
          .toList(),
    );
  }

  final String id;
  final String bodyText;
  final String status;
  final DateTime createdAt;
  final List<DoubtReply> replies;
}
