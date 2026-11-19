import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'live_class_models.dart';

/// GET student/live-classes/upcoming (apps/api/src/live-classes) — every
/// non-cancelled, not-yet-ended class across the student's entitled courses.
final upcomingLiveClassesProvider = FutureProvider.autoDispose<List<LiveClass>>(
  (ref) async {
    final api = ref.watch(apiClientProvider);
    final response = await api.dio.get('/student/live-classes/upcoming');
    return (response.data['data'] as List)
        .cast<Map<String, dynamic>>()
        .map(LiveClass.fromJson)
        .toList();
  },
);

/// POST student/live-classes/:id/join — re-checked server-side (entitlement +
/// join window), records attendance, returns the embed URL to load.
Future<String> joinLiveClass(WidgetRef ref, String id) async {
  final api = ref.read(apiClientProvider);
  final response = await api.dio.post('/student/live-classes/$id/join');
  return response.data['data']['url'] as String;
}
