import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/confirm_logout.dart';
import '../data/dashboard_models.dart';
import '../data/dashboard_repository.dart';
import 'widgets/continue_learning_section.dart';
import 'widgets/hero_panel.dart';
import 'widgets/mistake_dna_card.dart';
import 'widgets/needs_attention_card.dart';
import 'widgets/readiness_gauge_card.dart';
import 'widgets/streak_card.dart';
import 'widgets/weekly_goal_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    // Mirrors apps/web/app/[locale]/dashboard/page.tsx's server-side
    // `if (!data.onboarded) redirect('/onboarding')` — done here via ref.listen
    // (a build-time side effect) rather than inside `.when()`, since routing
    // during build would otherwise trigger a "setState during build" error.
    ref.listen(dashboardProvider, (previous, next) {
      next.whenData((data) {
        if (!data.onboarded) context.go('/onboarding');
      });
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('RajyaRank'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Search',
            onPressed: () => context.push('/search'),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_none),
            tooltip: 'Notifications',
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined),
            tooltip: 'Account',
            onPressed: () => context.push('/account'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => confirmLogout(context, ref),
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
            const Icon(
              Icons.wifi_off_rounded,
              color: AppColors.muted,
              size: 40,
            ),
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

class _DashboardBody extends ConsumerWidget {
  const _DashboardBody({required this.data, required this.onRefresh});

  final DashboardData data;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = data.greetingName;
    final weakTopicCount = ref.watch(weakTopicsProvider).maybeWhen(
      data: (list) => list.length,
      orElse: () => 0,
    );

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 380),
      curve: Curves.easeOut,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(
          offset: Offset(0, (1 - t) * 12),
          child: child,
        ),
      ),
      child: RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    name == null || name.isEmpty ? 'Hey there' : 'Hey, $name',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Text(
              'What should you study today?',
              style: TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (data.resumeLessonId != null) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          context.push('/learn/${data.resumeLessonId}'),
                      icon: const Icon(Icons.play_circle_outline, size: 18),
                      label: const Text('Continue Learning'),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/current-affairs'),
                    icon: const Icon(Icons.newspaper_outlined, size: 18),
                    label: const Text('Current Affairs'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            HeroPanel(data: data),
            const SizedBox(height: 20),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.6,
              children: [
                _StatCard(
                  icon: Icons.schedule_rounded,
                  label: 'Study time',
                  value: '${data.studyTimeMinutes}m',
                  accent: AppColors.teal500,
                ),
                _StatCard(
                  icon: Icons.menu_book_rounded,
                  label: 'Course',
                  value: '${data.coursePercent}%',
                  accent: AppColors.navy800,
                ),
                _StatCard(
                  icon: Icons.fact_check_rounded,
                  label: 'Avg score',
                  value: data.avgTestScorePercent == null
                      ? '—'
                      : '${data.avgTestScorePercent}%',
                  accent: AppColors.navy800,
                ),
                _StatCard(
                  icon: Icons.local_fire_department_rounded,
                  label: 'Streak',
                  value: '${data.studyStreakDays}d',
                  accent: AppColors.orange500,
                ),
              ],
            ),
            const SizedBox(height: 24),
            ContinueLearningSection(items: data.continueWatching),
            if (data.continueWatching.isNotEmpty) const SizedBox(height: 8),
            Text(
              "Today's plan",
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            if (data.todayPlan.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Nothing scheduled yet. Pick a course.'),
                ),
              )
            else
              ...data.todayPlan.map(
                (item) => Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: item.lessonId == null
                        ? null
                        : () => context.push('/learn/${item.lessonId}'),
                    child: ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: AppColors.navy100,
                        child: Icon(
                          Icons.play_arrow_rounded,
                          color: AppColors.navy900,
                        ),
                      ),
                      title: Text(item.titleEn),
                      subtitle: Text(
                        item.freePreview ? '${item.kind} · Free preview' : item.kind,
                      ),
                      trailing: item.lessonId == null
                          ? null
                          : Text(
                              item.freePreview ? 'Open' : 'Unlock',
                              style: const TextStyle(
                                color: AppColors.navy900,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            const ReadinessGaugeCard(),
            const SizedBox(height: 16),
            const MistakeDnaCard(),
            const SizedBox(height: 16),
            WeeklyGoalCard(data: data, weakTopicCount: weakTopicCount),
            const SizedBox(height: 16),
            StreakCard(studyStreakDays: data.studyStreakDays, streakWeek: data.streakWeek),
            const SizedBox(height: 16),
            const NeedsAttentionCard(),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.accent,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: accent, size: 19),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  value,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
                Text(
                  label,
                  style: const TextStyle(color: AppColors.muted, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
