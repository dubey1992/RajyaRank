import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'my_quizzes_models.dart';

final myQuizzesProvider = FutureProvider.autoDispose<List<PersonalQuizView>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/my-quizzes');
  return (response.data['data'] as List).cast<Map<String, dynamic>>().map(PersonalQuizView.fromJson).toList();
});

final personalQuizDetailProvider = FutureProvider.autoDispose.family<PersonalQuizDetail, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/my-quizzes/$id');
  return PersonalQuizDetail.fromJson(response.data['data'] as Map<String, dynamic>);
});

class MyQuizzesRepository {
  MyQuizzesRepository(this._ref);
  final Ref _ref;

  Future<PersonalQuizView> create({required String title, String? customTopicId}) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/my-quizzes',
      data: {'title': title, 'customTopicId': ?customTopicId},
    );
    return PersonalQuizView.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<void> deleteQuiz(String id) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.delete('/student/my-quizzes/$id');
  }

  Future<PersonalQuizQuestionEditView> addQuestion({
    required String quizId,
    required QuestionType type,
    required String text,
    required List<PersonalQuizOption> options,
    required dynamic correctAnswer,
    String? explanation,
  }) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/my-quizzes/$quizId/questions',
      data: {
        'type': questionTypeWire(type),
        'text': text,
        'options': options.map((o) => o.toJson()).toList(),
        'correctAnswer': correctAnswer,
        'explanation': ?explanation,
      },
    );
    return PersonalQuizQuestionEditView.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<void> deleteQuestion(String quizId, String questionId) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.delete('/student/my-quizzes/$quizId/questions/$questionId');
  }

  Future<BulkImportResult> bulkImport(String quizId, String text) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/my-quizzes/$quizId/questions/bulk-text',
      data: {'text': text},
    );
    return BulkImportResult.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<StartAttemptResponse> startAttempt(String quizId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post('/student/my-quizzes/$quizId/attempts');
    return StartAttemptResponse.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<PersonalQuizAttemptResult> submitAttempt(String attemptId, Map<String, dynamic> answers) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/my-quizzes/attempts/$attemptId/submit',
      data: {'answers': answers},
    );
    return PersonalQuizAttemptResult.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}

final myQuizzesRepositoryProvider = Provider((ref) => MyQuizzesRepository(ref));
