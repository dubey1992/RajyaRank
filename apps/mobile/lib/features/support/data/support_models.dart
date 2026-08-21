enum TicketCategory {
  loginOtp,
  payment,
  accessEntitlement,
  videoPdf,
  test,
  contentCorrection,
  refund,
  account,
  accountDeletion,
  other,
}

extension TicketCategoryLabel on TicketCategory {
  String get wireValue => switch (this) {
    TicketCategory.loginOtp => 'LOGIN_OTP',
    TicketCategory.payment => 'PAYMENT',
    TicketCategory.accessEntitlement => 'ACCESS_ENTITLEMENT',
    TicketCategory.videoPdf => 'VIDEO_PDF',
    TicketCategory.test => 'TEST',
    TicketCategory.contentCorrection => 'CONTENT_CORRECTION',
    TicketCategory.refund => 'REFUND',
    TicketCategory.account => 'ACCOUNT',
    TicketCategory.accountDeletion => 'ACCOUNT_DELETION',
    TicketCategory.other => 'OTHER',
  };

  String get label => switch (this) {
    TicketCategory.loginOtp => 'Login / OTP',
    TicketCategory.payment => 'Payment',
    TicketCategory.accessEntitlement => 'Course access',
    TicketCategory.videoPdf => 'Video / PDF issue',
    TicketCategory.test => 'Test issue',
    TicketCategory.contentCorrection => 'Content correction',
    TicketCategory.refund => 'Refund',
    TicketCategory.account => 'Account',
    TicketCategory.accountDeletion => 'Account deletion',
    TicketCategory.other => 'Other',
  };
}

class TicketReply {
  TicketReply({required this.bodyText, required this.createdAt});

  factory TicketReply.fromJson(Map<String, dynamic> json) {
    return TicketReply(
      bodyText: json['bodyText'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  final String bodyText;
  final DateTime createdAt;
}

class TicketView {
  TicketView({
    required this.id,
    required this.category,
    required this.subject,
    required this.status,
    required this.createdAt,
    required this.replies,
  });

  factory TicketView.fromJson(Map<String, dynamic> json) {
    final repliesJson = (json['replies'] as List<dynamic>?) ?? const [];
    return TicketView(
      id: json['id'] as String,
      category: json['category'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      status: json['status'] as String? ?? 'OPEN',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      replies: repliesJson
          .cast<Map<String, dynamic>>()
          .map(TicketReply.fromJson)
          .toList(),
    );
  }

  final String id;
  final String category;
  final String subject;
  final String status;
  final DateTime createdAt;
  final List<TicketReply> replies;
}
