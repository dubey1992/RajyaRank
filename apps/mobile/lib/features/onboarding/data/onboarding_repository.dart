import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'onboarding_models.dart';

final statesProvider = FutureProvider.autoDispose<List<StateOption>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/states');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(StateOption.fromJson)
      .toList();
});

final examsProvider = FutureProvider.autoDispose<List<ExamOption>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/exams');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(ExamOption.fromJson)
      .toList();
});

class OnboardingRepository {
  OnboardingRepository(this._ref);
  final Ref _ref;

  /// POST student/onboarding (apps/api/src/student/student.controller.ts) —
  /// same payload shape as `onboardingSchema` in packages/contracts.
  Future<void> submit({
    required String stateId,
    required String targetExamId,
    required Qualification qualification,
    required int dailyStudyMinutes,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/student/onboarding',
      data: {
        'stateId': stateId,
        'targetExamId': targetExamId,
        'qualification': qualification.wireValue,
        'dailyStudyMinutes': dailyStudyMinutes,
      },
    );
  }

  Future<void> skip() async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post('/student/onboarding/skip');
  }

  /// POST student/institution/join — a separate, optional step from
  /// onboarding itself (an access code here means "I belong to this
  /// institute", distinct from a checkout discount code).
  Future<void> joinInstitution(String accessCode) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/student/institution/join',
      data: {'accessCode': accessCode},
    );
  }
}

final onboardingRepositoryProvider = Provider(
  (ref) => OnboardingRepository(ref),
);
