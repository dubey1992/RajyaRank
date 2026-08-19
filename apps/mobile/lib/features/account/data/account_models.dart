/// Hand-ported from `ProfileResponse` in packages/contracts/src/auth.ts.
class ProfileInstitution {
  ProfileInstitution({required this.id, required this.name});

  factory ProfileInstitution.fromJson(Map<String, dynamic> json) {
    return ProfileInstitution(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
    );
  }

  final String id;
  final String name;
}

class ProfileData {
  ProfileData({
    required this.displayName,
    required this.email,
    required this.phone,
    required this.fullName,
    required this.institution,
    required this.hasPassword,
  });

  factory ProfileData.fromJson(Map<String, dynamic> json) {
    final instJson = json['institution'] as Map<String, dynamic>?;
    return ProfileData(
      displayName: json['displayName'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      fullName: json['fullName'] as String?,
      institution:
          instJson == null ? null : ProfileInstitution.fromJson(instJson),
      hasPassword: json['hasPassword'] as bool? ?? false,
    );
  }

  final String? displayName;
  final String? email;
  final String? phone;
  final String? fullName;
  final ProfileInstitution? institution;
  final bool hasPassword;
}

/// Hand-ported from `StudyGoals` in packages/contracts/src/student.ts —
/// same field set `onboarding_repository.dart`'s submit() writes once;
/// this is the editable view of those same fields.
class StudyGoals {
  StudyGoals({
    required this.targetExamNameEn,
    required this.qualification,
    required this.dailyStudyMinutes,
    required this.targetDate,
  });

  factory StudyGoals.fromJson(Map<String, dynamic> json) {
    final targetDateRaw = json['targetDate'] as String?;
    return StudyGoals(
      targetExamNameEn: json['targetExamNameEn'] as String?,
      qualification: json['qualification'] as String?,
      dailyStudyMinutes: (json['dailyStudyMinutes'] as num?)?.toInt(),
      targetDate: targetDateRaw == null ? null : DateTime.tryParse(targetDateRaw),
    );
  }

  final String? targetExamNameEn;
  final String? qualification;
  final int? dailyStudyMinutes;
  final DateTime? targetDate;
}
