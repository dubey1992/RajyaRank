import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/study_plan_models.dart';
import '../data/study_plan_repository.dart';

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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
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
            icon: _regenerating
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh),
            tooltip: 'Regenerate plan',
            onPressed: _regenerating ? null : _regenerate,
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
                    return GestureDetector(
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
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
      final iso = picked.toIso8601String().split('T').first;
      await ref
          .read(studyPlanRepositoryProvider)
          .reschedule(widget.item.id, iso);
      ref.invalidate(studyPlanWeekProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
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
            Text(
              '${item.estimatedMinutes} min',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
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
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}
