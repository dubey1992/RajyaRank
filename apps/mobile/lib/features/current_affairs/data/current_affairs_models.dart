class CurrentAffairItem {
  CurrentAffairItem({
    required this.id,
    required this.titleEn,
    required this.bodyEn,
    required this.category,
    required this.publishedAt,
  });

  factory CurrentAffairItem.fromJson(Map<String, dynamic> json) {
    return CurrentAffairItem(
      id: json['id'] as String,
      titleEn: json['titleEn'] as String? ?? '',
      bodyEn: json['bodyEn'] as String? ?? '',
      category: json['category'] as String? ?? '',
      publishedAt:
          DateTime.tryParse(json['publishedAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  final String id;
  final String titleEn;
  final String bodyEn;
  final String category;
  final DateTime publishedAt;

  /// Mirrors web's client-computed "New" badge — the API has no isNew flag.
  bool get isNew =>
      DateTime.now().difference(publishedAt) < const Duration(hours: 48);
}
