import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'test_models.dart';

final testsCatalogueProvider =
    FutureProvider.autoDispose<List<StudentTestListItem>>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/tests');
      return (response.data['data'] as List)
          .cast<Map<String, dynamic>>()
          .map(StudentTestListItem.fromJson)
          .toList();
    });

final attemptResultProvider = FutureProvider.autoDispose
    .family<AttemptResult, String>((ref, attemptId) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/attempts/$attemptId/result');
      return AttemptResult.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    });

class TestRepository {
  TestRepository(this._ref);
  final Ref _ref;

  /// POST student/tests/:id/attempts — idempotent: resumes an in-progress
  /// attempt if one already exists rather than starting a fresh one.
  Future<StartAttemptResponse> startAttempt(String testVersionId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/tests/$testVersionId/attempts',
    );
    return StartAttemptResponse.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  /// PUT student/attempts/:id/answers/:questionVersionId — per-question
  /// autosave, fire-and-forget (mirrors web: a dropped save just means the
  /// next one, or the timer/submit re-sync, wins).
  Future<void> saveAnswer(
    String attemptId,
    String questionVersionId, {
    required Object? response,
    required bool markedForReview,
    required int sequenceNo,
    required int timeSpentMs,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.put(
      '/student/attempts/$attemptId/answers/$questionVersionId',
      data: {
        'response': response,
        'markedForReview': markedForReview,
        'sequenceNo': sequenceNo,
        'timeSpentMs': timeSpentMs,
      },
    );
  }

  /// POST student/attempts/:id/submit — scores synchronously and returns the
  /// full result; safe to call more than once (returns the cached result).
  Future<AttemptResult> submit(String attemptId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post('/student/attempts/$attemptId/submit');
    return AttemptResult.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }
}

final testRepositoryProvider = Provider((ref) => TestRepository(ref));
