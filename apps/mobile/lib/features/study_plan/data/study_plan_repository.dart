import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'study_plan_models.dart';

final studyPlanWeekProvider = FutureProvider.autoDispose<List<StudyPlanDay>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/study-plan/week');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(StudyPlanDay.fromJson)
      .toList();
});

class StudyPlanRepository {
  StudyPlanRepository(this._ref);
  final Ref _ref;

  Future<void> markStatus(String itemId, String status) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch(
      '/student/study-plan/items/$itemId',
      data: {'status': status},
    );
  }

  /// `toDate` is an ISO date string (YYYY-MM-DD is accepted by the server's
  /// datetime coercion).
  Future<void> reschedule(String itemId, String toDate) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/student/study-plan/items/$itemId/reschedule',
      data: {'toDate': toDate},
    );
  }

  Future<void> regenerate() async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post('/student/study-plan/regenerate');
  }
}

final studyPlanRepositoryProvider = Provider((ref) => StudyPlanRepository(ref));
