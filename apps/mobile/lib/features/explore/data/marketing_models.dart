class Testimonial {
  Testimonial({
    required this.id,
    required this.quoteEn,
    required this.studentName,
    required this.initials,
    required this.examLabel,
  });

  factory Testimonial.fromJson(Map<String, dynamic> json) {
    return Testimonial(
      id: json['id'] as String,
      quoteEn: json['quoteEn'] as String? ?? '',
      studentName: json['studentName'] as String? ?? '',
      initials: json['initials'] as String? ?? '',
      examLabel: json['examLabel'] as String? ?? '',
    );
  }

  final String id;
  final String quoteEn;
  final String studentName;
  final String initials;
  final String examLabel;
}

class Faq {
  Faq({required this.id, required this.questionEn, required this.answerEn});

  factory Faq.fromJson(Map<String, dynamic> json) {
    return Faq(
      id: json['id'] as String,
      questionEn: json['questionEn'] as String? ?? '',
      answerEn: json['answerEn'] as String? ?? '',
    );
  }

  final String id;
  final String questionEn;
  final String answerEn;
}
