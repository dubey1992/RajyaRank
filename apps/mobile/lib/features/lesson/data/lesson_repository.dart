import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'lesson_models.dart';

final lessonDetailProvider = FutureProvider.autoDispose
    .family<LessonDetail, String>((ref, lessonId) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/lessons/$lessonId');
      return LessonDetail.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    });

class LessonRepository {
  LessonRepository(this._ref);
  final Ref _ref;

  /// POST student/lessons/:id/playback-token — must be called on demand
  /// (click-to-play), never prefetched: the presigned S3 URL expires in 300s.
  Future<PlaybackToken> requestPlaybackToken(String lessonId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/lessons/$lessonId/playback-token',
    );
    return PlaybackToken.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  /// PATCH student/lessons/:id/progress — fire-and-forget heartbeat, except
  /// for a completion claim, which the server can reject (409
  /// LESSON_ENGAGEMENT_INSUFFICIENT) if too little time has been logged.
  Future<void> updateProgress(
    String lessonId, {
    String? status,
    int? videoPositionSeconds,
    int? percentComplete,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch(
      '/student/lessons/$lessonId/progress',
      data: {
        'status': ?status,
        'videoPositionSeconds': ?videoPositionSeconds,
        'percentComplete': ?percentComplete,
      },
    );
  }

  /// POST student/lessons/:id/bookmark — toggles, returns the new state.
  Future<bool> toggleBookmark(String lessonId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/student/lessons/$lessonId/bookmark',
    );
    return response.data['data']['bookmarked'] as bool;
  }
}

final lessonRepositoryProvider = Provider((ref) => LessonRepository(ref));
