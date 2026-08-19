import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/dashboard_models.dart';
import '../data/dashboard_repository.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('RajyaRank'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: SafeArea(
        child: dashboard.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _DashboardError(
            message: apiErrorMessage(error),
            onRetry: () => ref.invalidate(dashboardProvider),
          ),
          data: (data) => _DashboardBody(
            data: data,
            onRefresh: () async => ref.invalidate(dashboardProvider),
          ),
        ),
      ),
    );
  }
}

class _DashboardError extends StatelessWidget {
  const _DashboardError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, color: AppColors.muted, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.data, required this.onRefresh});

  final DashboardData data;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final name = data.greetingName;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            name == null || name.isEmpty ? 'Hey there' : 'Hey, $name',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 4),
          Text(
            data.targetExamNameEn == null
                ? 'What should you study today?'
                : 'Preparing for ${data.targetExamNameEn}'
                    '${data.examCountdownDays != null ? ' · ${data.examCountdownDays} days left' : ''}',
            style: const TextStyle(color: AppColors.muted),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.local_fire_department_rounded,
                  label: 'Streak',
                  value: '${data.studyStreakDays}d',
                  accent: AppColors.orange500,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.schedule_rounded,
                  label: 'Study time',
                  value: '${data.studyTimeMinutes}m',
                  accent: AppColors.teal500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  icon: Icons.menu_book_rounded,
                  label: 'Course',
                  value: '${data.coursePercent}%',
                  accent: AppColors.navy800,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StatCard(
                  icon: Icons.fact_check_rounded,
                  label: 'Tests',
                  value: '${data.testsAttempted}',
                  accent: AppColors.navy800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text("Today's plan", style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (data.todayPlan.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('Nothing scheduled yet — check the web app to set up your study plan.'),
              ),
            )
          else
            ...data.todayPlan.map(
              (item) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: AppColors.navy100,
                    child: Icon(Icons.play_arrow_rounded, color: AppColors.navy900),
                  ),
                  title: Text(item.titleEn),
                  subtitle: Text(item.kind),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.icon, required this.label, required this.value, required this.accent});

  final IconData icon;
  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: accent),
            const SizedBox(height: 10),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}
