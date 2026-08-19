import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'revision_models.dart';

final weakTopicsProvider = FutureProvider.autoDispose<List<WeakTopic>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/weak-topics');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(WeakTopic.fromJson)
      .toList();
});

final revisionDataProvider = FutureProvider.autoDispose<RevisionData>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/revision');
  return RevisionData.fromJson(response.data['data'] as Map<String, dynamic>);
});
