class WishlistCourse {
  WishlistCourse({required this.id, required this.titleEn});

  factory WishlistCourse.fromJson(Map<String, dynamic> json) {
    return WishlistCourse(
      id: json['id'] as String,
      titleEn: json['titleEn'] as String? ?? '',
    );
  }

  final String id;
  final String titleEn;
}
