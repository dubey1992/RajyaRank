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

/// PATCH student/live-classes/:id/heartbeat — bumps LiveClassAttendance's
/// lastSeenAt so the admin attendance roster can show a real "duration
/// attended" instead of just a join timestamp. Mirrors the web join view's
/// own 20s heartbeat interval (apps/web/components/LiveClassesList.tsx).
/// Best-effort by design — a failure here should never interrupt playback.
Future<void> sendLiveClassHeartbeat(WidgetRef ref, String id) async {
  final api = ref.read(apiClientProvider);
  try {
    await api.dio.patch('/student/live-classes/$id/heartbeat');
  } catch (_) {
    // Best-effort — a missed heartbeat just means a slightly shorter
    // recorded duration, never worth surfacing to the student.
  }
}
