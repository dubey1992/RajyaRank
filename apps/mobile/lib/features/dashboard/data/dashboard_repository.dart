import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'dashboard_models.dart';

/// Mirrors GET student/dashboard (apps/api/src/student/student.controller.ts)
/// — the same aggregate the web app's dashboard page renders.
final dashboardProvider = FutureProvider.autoDispose<DashboardData>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/dashboard');
  return DashboardData.fromJson(response.data['data'] as Map<String, dynamic>);
});

/// GET student/readiness — Exam Readiness gauge.
final readinessProvider = FutureProvider.autoDispose<ReadinessData>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/readiness');
  return ReadinessData.fromJson(response.data['data'] as Map<String, dynamic>);
});

/// GET student/mistake-dna — Mistake DNA breakdown.
final mistakeDnaProvider = FutureProvider.autoDispose<MistakeDnaData>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/mistake-dna');
  return MistakeDnaData.fromJson(
    response.data['data'] as Map<String, dynamic>,
  );
});

/// GET student/weak-topics — "Needs attention" card.
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

/// GET student/study-plan/week — only used here to pick out this week's
/// pending MISTAKE_DRILL items for the Mistake Coach preview, same as
/// dashboard/page.tsx:40-43 on web.
final weekPlanItemsProvider = FutureProvider.autoDispose<List<WeekPlanItem>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/study-plan/week');
  final days = (response.data['data'] as List).cast<Map<String, dynamic>>();
  return [
    for (final day in days)
      for (final item in ((day['items'] as List<dynamic>?) ?? const [])
          .cast<Map<String, dynamic>>())
        WeekPlanItem.fromJson(day['date'] as String? ?? '', item),
  ];
});
