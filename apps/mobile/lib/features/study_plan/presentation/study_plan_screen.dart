import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/study_plan_models.dart';
import '../data/study_plan_repository.dart';
import 'custom_topics_screen.dart';

class StudyPlanScreen extends ConsumerStatefulWidget {
  const StudyPlanScreen({super.key});

  @override
  ConsumerState<StudyPlanScreen> createState() => _StudyPlanScreenState();
}

class _StudyPlanScreenState extends ConsumerState<StudyPlanScreen> {
  int _selectedDay = 0;
  bool _regenerating = false;

  Future<void> _regenerate() async {
    setState(() => _regenerating = true);
    try {
      await ref.read(studyPlanRepositoryProvider).regenerate();
      ref.invalidate(studyPlanWeekProvider);
      setState(() => _selectedDay = 0);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _regenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final week = ref.watch(studyPlanWeekProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Study Plan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.checklist, color: Colors.white),
            tooltip: 'My topics',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const CustomTopicsScreen()),
            ),
          ),
          // A bare refresh icon read as unfamiliar/unclear to students (no
          // visible label, only a long-press tooltip) — a labeled pill button
          // matches the web app's own "↻ Regenerate plan" button text instead.
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: _regenerating
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                  )
                : OutlinedButton.icon(
                    onPressed: _regenerate,
                    icon: const Icon(
                      Icons.refresh,
                      size: 16,
                      color: Colors.white,
                    ),
                    label: const Text('Regenerate plan'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white70),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
          ),
        ],
      ),
      body: week.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
          ),
        ),
        data: (days) {
          if (days.isEmpty) return const SizedBox.shrink();
          final index = _selectedDay.clamp(0, days.length - 1);
          final day = days[index];
          return Column(
            children: [
              SizedBox(
                height: 76,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  itemCount: days.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final date = DateTime.tryParse(days[i].date);
                    final selected = i == index;
                    final dayLabel = i == 0
                        ? 'Today'
                        : (date != null ? _weekdayLabel(date) : 'Day ${i + 1}');
                    return Semantics(
                      button: true,
                      selected: selected,
                      label: date != null ? '$dayLabel, ${date.day}' : dayLabel,
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedDay = i),
                        child: Container(
                          width: 56,
                          decoration: BoxDecoration(
                            color: selected ? AppColors.navy900 : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: selected
                                  ? AppColors.navy900
                                  : AppColors.line,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                i == 0
                                    ? 'Today'
                                    : (date != null ? _weekdayLabel(date) : ''),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: selected
                                      ? Colors.white70
                                      : AppColors.muted,
                                ),
                              ),
                              Text(
                                date != null ? '${date.day}' : '-',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: selected
                                      ? Colors.white
                                      : AppColors.ink,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const Divider(height: 1, color: AppColors.line),
              Expanded(
                child: day.items.isEmpty
                    ? const Center(
                        child: Text(
                          'Nothing planned for this day.',
                          style: TextStyle(color: AppColors.muted),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: day.items.length,
                        itemBuilder: (context, i) => _PlanItemCard(
                          item: day.items[i],
                          dayDate: day.date,
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _weekdayLabel(DateTime date) {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return labels[date.weekday - 1];
  }
}

class _PlanItemCard extends ConsumerStatefulWidget {
  const _PlanItemCard({required this.item, required this.dayDate});

  final PlanItemView item;
  final String dayDate;

  @override
  ConsumerState<_PlanItemCard> createState() => _PlanItemCardState();
}

class _PlanItemCardState extends ConsumerState<_PlanItemCard> {
  PlanItemStatus? _optimisticStatus;
  bool _busy = false;

  PlanItemStatus get _status => _optimisticStatus ?? widget.item.status;

  Future<void> _setStatus(String status) async {
    setState(() {
      _busy = true;
      _optimisticStatus = status == 'DONE'
          ? PlanItemStatus.done
          : PlanItemStatus.skipped;
    });
    try {
      await ref
          .read(studyPlanRepositoryProvider)
          .markStatus(widget.item.id, status);
    } catch (error) {
      if (mounted) {
        setState(() => _optimisticStatus = null);
        if (apiErrorCode(error) == 'SUBSCRIPTION_REQUIRED') {
          await _promptSubscriptionRequired();
        } else {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
        }
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _promptSubscriptionRequired() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('A subscription plan is needed'),
        content: const Text(
          'You\'ve used your free custom topics. Do you want to continue to purchase a plan for unlimited topics?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('View plans')),
        ],
      ),
    );
    if (confirmed == true && mounted) context.push('/pricing');
  }

  Future<void> _reschedule() async {
    final base = DateTime.tryParse(widget.dayDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: base.add(const Duration(days: 1)),
      firstDate: base,
      lastDate: base.add(const Duration(days: 60)),
    );
    if (picked == null) return;
    setState(() => _busy = true);
    try {
      // Server validates `toDate` with zod's `.datetime()`, which requires a
      // full ISO-8601 UTC string ("...T00:00:00.000Z") — a bare date like
      // "2026-08-25" fails that check with a 422 VALIDATION_FAILED.
      final iso = DateTime.utc(
        picked.year,
        picked.month,
        picked.day,
      ).toIso8601String();
      await ref
          .read(studyPlanRepositoryProvider)
          .reschedule(widget.item.id, iso);
      ref.invalidate(studyPlanWeekProvider);
    } catch (error) {
      if (mounted) {
        if (apiErrorCode(error) == 'SUBSCRIPTION_REQUIRED') {
          await _promptSubscriptionRequired();
        } else {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
        }
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final isPending = _status == PlanItemStatus.pending;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(_kindIcon(item.kind), size: 18, color: AppColors.navy800),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    item.titleEn,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                _StatusPill(status: _status),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  '${item.estimatedMinutes} min',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
                if (item.kind == PlanItemKind.custom) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.teal500.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'My topic',
                      style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: AppColors.teal500),
                    ),
                  ),
                ],
              ],
            ),
            if (item.noteText != null && item.noteText!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                item.noteText!,
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
            if (item.resourceUrl != null) ...[
              const SizedBox(height: 4),
              InkWell(
                onTap: () => launchUrl(Uri.parse(item.resourceUrl!), mode: LaunchMode.externalApplication),
                child: Text(
                  item.resourceLabel?.isNotEmpty == true ? item.resourceLabel! : item.resourceUrl!,
                  style: const TextStyle(color: AppColors.navy800, fontSize: 12, decoration: TextDecoration.underline),
                ),
              ),
            ],
            if (isPending) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  if (item.lessonId != null)
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => context.push('/learn/${item.lessonId}'),
                      child: Text(item.freePreview ? 'Open' : 'Unlock'),
                    ),
                  const Spacer(),
                  TextButton(
                    onPressed: _busy ? null : _reschedule,
                    child: const Text('Reschedule'),
                  ),
                  TextButton(
                    onPressed: _busy ? null : () => _setStatus('SKIPPED'),
                    child: const Text('Skip'),
                  ),
                  ElevatedButton(
                    onPressed: _busy ? null : () => _setStatus('DONE'),
                    child: const Text('Done'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _kindIcon(PlanItemKind kind) => switch (kind) {
    PlanItemKind.lesson => Icons.menu_book_outlined,
    PlanItemKind.weakTopicDrill => Icons.trending_up,
    PlanItemKind.mistakeDrill => Icons.error_outline,
    PlanItemKind.test => Icons.quiz_outlined,
    PlanItemKind.custom => Icons.edit_note,
    PlanItemKind.unknown => Icons.circle_outlined,
  };
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final PlanItemStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      PlanItemStatus.done => ('Done', AppColors.success),
      PlanItemStatus.skipped => ('Skipped', AppColors.muted),
      PlanItemStatus.missed => ('Missed', AppColors.danger),
      PlanItemStatus.rescheduled => ('Rescheduled', AppColors.warning),
      PlanItemStatus.pending => ('Pending', AppColors.navy800),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
