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
