import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'pyq_models.dart';

final pyqPapersProvider = FutureProvider.autoDispose<List<PyqPaper>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/pyq-papers');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(PyqPaper.fromJson)
      .toList();
});

class PyqRepository {
  PyqRepository(this._ref);
  final Ref _ref;

  /// GET student/pyq-papers/:id/download — a fresh 300s presigned S3 URL
  /// per call; never cache it, request on-demand at open time.
  Future<String> downloadUrl(String paperId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.get(
      '/student/pyq-papers/$paperId/download',
    );
    return response.data['data']['url'] as String;
  }
}

final pyqRepositoryProvider = Provider((ref) => PyqRepository(ref));
