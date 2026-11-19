import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../account/data/account_repository.dart';
import '../../../my_papers/data/my_papers_repository.dart';
import '../../../my_quizzes/data/my_quizzes_repository.dart';
import '../../../study_plan/data/study_plan_models.dart';
import '../../../study_plan/data/study_plan_repository.dart';

const _dismissKey = 'rr_hide_getting_started';

/// First-time feature-discovery checklist — the mobile mirror of the web
/// dashboard's GettingStartedChecklist. Auto-hides permanently once every
/// step is genuinely done (recomputed fresh each load, not a stored "seen"
/// flag); can also be dismissed early, per-device, via SharedPreferences —
/// a non-secret UI convenience, unlike the token storage elsewhere in this
/// app which deliberately uses flutter_secure_storage instead.
class GettingStartedChecklist extends ConsumerStatefulWidget {
  const GettingStartedChecklist({super.key});

  @override
  ConsumerState<GettingStartedChecklist> createState() => _GettingStartedChecklistState();
}

class _GettingStartedChecklistState extends ConsumerState<GettingStartedChecklist> {
  bool _dismissed = true; // hidden until the effect confirms it isn't dismissed, avoids a flash

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) setState(() => _dismissed = prefs.getBool(_dismissKey) ?? false);
    } catch (_) {
      if (mounted) setState(() => _dismissed = false);
    }
  }

  Future<void> _dismiss() async {
    setState(() => _dismissed = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_dismissKey, true);
    } catch (_) {
      // best-effort only
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_dismissed) return const SizedBox.shrink();

    final goals = ref.watch(studyGoalsProvider);
    final topics = ref.watch(customTopicsProvider);
    final week = ref.watch(studyPlanWeekProvider);
    final quizzes = ref.watch(myQuizzesProvider);
    final papers = ref.watch(myPapersProvider);

    // Any of these still loading is treated as "not done yet" rather than
    // blocking the whole card on a spinner — each step resolves in place as
    // its own provider settles.
    final hasGoal = goals.maybeWhen(data: (g) => g.hasGoal, orElse: () => false);
    final hasTopic = topics.maybeWhen(data: (list) => list.isNotEmpty, orElse: () => false);
    final hasCompletedTask = week.maybeWhen(
      data: (days) => days.any((d) => d.items.any((i) => i.status == PlanItemStatus.done)),
      orElse: () => false,
    );
    final hasQuiz = quizzes.maybeWhen(data: (list) => list.isNotEmpty, orElse: () => false);
    final hasPaper = papers.maybeWhen(data: (list) => list.isNotEmpty, orElse: () => false);

    final steps = [
      (hasGoal, 'Set your study goal', '/dashboard'),
      (hasTopic, 'Add your first topic', '/dashboard'),
      (hasCompletedTask, 'Complete your first task', '/dashboard'),
      (hasQuiz, 'Try a practice test', '/my-quizzes'),
      (hasPaper, 'Explore Previous Year Papers', '/my-papers'),
    ];
    final doneCount = steps.where((s) => s.$1).length;
    if (doneCount == steps.length) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [AppColors.orange500.withValues(alpha: 0.08), Colors.white], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.orange500.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Getting started', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                    Text('$doneCount/${steps.length} done', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: _dismiss,
                tooltip: 'Hide',
              ),
            ],
          ),
          const SizedBox(height: 4),
          for (var i = 0; i < steps.length; i++)
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                if (i <= 2) {
                  // Study-plan related steps live on the Study Plan tab, not
                  // a standalone route — HomeShell's tabs aren't go_router
                  // routes (see its own doc comment).
                  context.go('/dashboard');
                } else {
                  context.push(steps[i].$3);
                }
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: steps[i].$1 ? AppColors.success : Colors.transparent,
                        shape: BoxShape.circle,
                        border: steps[i].$1 ? null : Border.all(color: AppColors.line),
                      ),
                      child: steps[i].$1
                          ? const Icon(Icons.check, size: 14, color: Colors.white)
                          : Text('${i + 1}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.muted)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        steps[i].$2,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: steps[i].$1 ? AppColors.success : AppColors.ink,
                          decoration: steps[i].$1 ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
