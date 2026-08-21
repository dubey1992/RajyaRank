import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'account_models.dart';

final profileProvider = FutureProvider.autoDispose<ProfileData>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/auth/me/profile');
  return ProfileData.fromJson(response.data['data'] as Map<String, dynamic>);
});

final studyGoalsProvider = FutureProvider.autoDispose<StudyGoals>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/profile/goals');
  return StudyGoals.fromJson(response.data['data'] as Map<String, dynamic>);
});

class AccountRepository {
  AccountRepository(this._ref);
  final Ref _ref;

  /// PATCH auth/me/profile — displayName/fullName only; phone/email are
  /// read-only, there is no change-email/phone endpoint on this surface.
  Future<void> updateProfile({String? displayName, String? fullName}) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch(
      '/auth/me/profile',
      data: {
        'displayName': ?displayName,
        'fullName': ?fullName,
      },
    );
  }

  /// PATCH student/profile/goals — separate from the one-time onboarding
  /// submit; regenerates the study plan synchronously, so this can take a
  /// moment longer than a typical save.
  Future<void> updateGoals({
    String? targetExamId,
    String? qualification,
    int? dailyStudyMinutes,
    DateTime? targetDate,
    bool clearTargetDate = false,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch(
      '/student/profile/goals',
      data: {
        'targetExamId': ?targetExamId,
        'qualification': ?qualification,
        'dailyStudyMinutes': ?dailyStudyMinutes,
        if (clearTargetDate) 'targetDate': null,
        if (!clearTargetDate && targetDate != null)
          'targetDate': targetDate.toUtc().toIso8601String(),
      },
    );
  }

  /// PATCH auth/me/password — revokes all sessions server-side, so the
  /// caller must sign the user out locally afterward rather than assuming
  /// the current access token still works.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch(
      '/auth/me/password',
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  Future<void> leaveInstitution() async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post('/student/institution/leave');
  }
}

final accountRepositoryProvider = Provider((ref) => AccountRepository(ref));
