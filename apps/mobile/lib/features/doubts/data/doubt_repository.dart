import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'doubt_models.dart';

final doubtsProvider = FutureProvider.autoDispose<List<DoubtView>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/doubts');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(DoubtView.fromJson)
      .toList();
});

class DoubtRepository {
  DoubtRepository(this._ref);
  final Ref _ref;

  Future<void> ask(String bodyText) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post('/student/doubts', data: {'bodyText': bodyText});
  }

  Future<void> reopen(String doubtId) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post('/student/doubts/$doubtId/reopen');
  }
}

final doubtRepositoryProvider = Provider((ref) => DoubtRepository(ref));
