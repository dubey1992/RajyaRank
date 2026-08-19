class NotificationItem {
  NotificationItem({
    required this.id,
    required this.category,
    required this.titleEn,
    required this.bodyEn,
    required this.read,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      category: json['category'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      bodyEn: json['bodyEn'] as String?,
      read: json['read'] as bool? ?? false,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  final String id;
  final String category;
  final String titleEn;
  final String? bodyEn;
  final bool read;
  final DateTime createdAt;
}

/// Mirrors `notificationPreferenceSchema` in packages/contracts/src/support.ts.
class NotificationPreferences {
  NotificationPreferences({
    required this.emailEnabled,
    required this.smsEnabled,
    required this.pushEnabled,
    required this.mutedCategories,
  });

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    final muted = (json['mutedCategories'] as List<dynamic>?) ?? const [];
    return NotificationPreferences(
      emailEnabled: json['emailEnabled'] as bool? ?? true,
      smsEnabled: json['smsEnabled'] as bool? ?? false,
      pushEnabled: json['pushEnabled'] as bool? ?? true,
      mutedCategories: muted.cast<String>().toSet(),
    );
  }

  final bool emailEnabled;
  final bool smsEnabled;
  final bool pushEnabled;
  final Set<String> mutedCategories;

  Map<String, dynamic> toJson() => {
    'emailEnabled': emailEnabled,
    'smsEnabled': smsEnabled,
    'pushEnabled': pushEnabled,
    'mutedCategories': mutedCategories.toList(),
  };

  NotificationPreferences copyWith({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    Set<String>? mutedCategories,
  }) {
    return NotificationPreferences(
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      mutedCategories: mutedCategories ?? this.mutedCategories,
    );
  }
}

/// The 16 NotificationCategory Prisma enum values, minus SECURITY/PAYMENT —
/// those two are always-delivered and can never be muted server-side.
const mutableNotificationCategories = [
  'COURSE_ACCESS',
  'NEW_LESSON',
  'TEST_REMINDER',
  'DAILY_PLAN',
  'DOUBT_ANSWER',
  'EXAM_NOTICE',
  'EXPIRY',
  'SUPPORT',
  'CURRENT_AFFAIRS',
  'ANNOUNCEMENT',
  'NEW_COURSE',
  'NEW_CONTENT',
];

String categoryLabel(String category) => switch (category) {
  'COURSE_ACCESS' => 'Course access',
  'NEW_LESSON' => 'New lessons',
  'TEST_REMINDER' => 'Test reminders',
  'DAILY_PLAN' => 'Daily study plan',
  'DOUBT_ANSWER' => 'Doubt answers',
  'EXAM_NOTICE' => 'Exam notices',
  'EXPIRY' => 'Plan/course expiry',
  'SUPPORT' => 'Support replies',
  'CURRENT_AFFAIRS' => 'Current affairs',
  'ANNOUNCEMENT' => 'Announcements',
  'NEW_COURSE' => 'New courses',
  'NEW_CONTENT' => 'New content',
  'SECURITY' => 'Security',
  'PAYMENT' => 'Payments',
  _ => category,
};
