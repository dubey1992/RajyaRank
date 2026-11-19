import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'my_papers_models.dart';

final myPapersProvider = FutureProvider.autoDispose<List<StudentPaperView>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/my-papers');
  return (response.data['data'] as List).cast<Map<String, dynamic>>().map(StudentPaperView.fromJson).toList();
});

class MyPapersRepository {
  MyPapersRepository(this._ref);
  final Ref _ref;

  /// Full upload flow: presigned-intent -> direct PUT to S3 -> complete
  /// (malware scan) -> create the paper record. Mirrors web's sequence
  /// exactly, just over Dio instead of the browser's fetch/File API.
  Future<StudentPaperView> uploadPaper({
    required String fileName,
    required String mimeType,
    required Uint8List bytes,
    required String title,
    int? year,
    int? questionCount,
    String? answerKeyText,
    void Function(String phase)? onPhase,
  }) async {
    final api = _ref.read(apiClientProvider);

    onPhase?.call('Preparing upload…');
    final intentResponse = await api.dio.post(
      '/student/my-papers/upload-intents',
      data: {'fileName': fileName, 'mimeType': mimeType, 'sizeBytes': bytes.length},
    );
    final intent = UploadIntentResponse.fromJson(intentResponse.data['data'] as Map<String, dynamic>);

    onPhase?.call('Uploading…');
    await Dio().put(
      intent.uploadUrl,
      data: bytes,
      options: Options(headers: {'Content-Type': mimeType}),
    );

    onPhase?.call('Finalizing…');
    await api.dio.post('/student/my-papers/assets/${intent.assetId}/complete', data: {});

    final paperResponse = await api.dio.post(
      '/student/my-papers',
      data: {
        'title': title,
        'assetId': intent.assetId,
        'year': ?year,
        'questionCount': ?questionCount,
        'answerKeyText': ?answerKeyText,
      },
    );
    return StudentPaperView.fromJson(paperResponse.data['data'] as Map<String, dynamic>);
  }

  Future<void> deletePaper(String id) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.delete('/student/my-papers/$id');
  }

  Future<String> downloadUrl(String id) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.get('/student/my-papers/$id/download');
    return (response.data['data'] as Map<String, dynamic>)['url'] as String;
  }

  Future<StudentPaperAttemptStart> startAttempt(String paperId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post('/student/my-papers/$paperId/attempts');
    return StudentPaperAttemptStart.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<StudentPaperAttemptResult> submitAttempt(String attemptId, Map<String, String> answers) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/my-papers/attempts/$attemptId/submit',
      data: {'answers': answers},
    );
    return StudentPaperAttemptResult.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}

final myPapersRepositoryProvider = Provider((ref) => MyPapersRepository(ref));
