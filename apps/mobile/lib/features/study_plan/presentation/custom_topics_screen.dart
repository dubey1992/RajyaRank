import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/study_plan_models.dart';
import '../data/study_plan_repository.dart';

/// Lets an independent student build their own topic list — the mobile
/// mirror of web's custom-topics manager on `/study-plan`. The first
/// [StudyPlanAccessStatus.freeTopicLimit] topics are free; beyond that an
/// unsubscribed student is offered the plans screen instead of a raw 409.
class CustomTopicsScreen extends ConsumerStatefulWidget {
  const CustomTopicsScreen({super.key});

  @override
  ConsumerState<CustomTopicsScreen> createState() => _CustomTopicsScreenState();
}

class _CustomTopicsScreenState extends ConsumerState<CustomTopicsScreen> {
  bool _adding = false;
  bool _bulkMode = false;
  bool _saving = false;
  String? _error;

  final _nameController = TextEditingController();
  final _moduleController = TextEditingController();
  final _bulkController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _moduleController.dispose();
    _bulkController.dispose();
    super.dispose();
  }

  Future<void> _submitSingle() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(studyPlanRepositoryProvider).createCustomTopic(
            name: name,
            moduleName: _moduleController.text.trim().isEmpty ? null : _moduleController.text.trim(),
          );
      _nameController.clear();
      ref.invalidate(customTopicsProvider);
      ref.invalidate(studyPlanAccessStatusProvider);
      ref.invalidate(studyPlanWeekProvider);
      setState(() => _adding = false);
    } catch (error) {
      if (apiErrorCode(error) == 'SUBSCRIPTION_REQUIRED') {
        await _promptSubscriptionRequired();
      } else {
        setState(() => _error = apiErrorMessage(error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _submitBulk() async {
    final names = _bulkController.text
        .split('\n')
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();
    if (names.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(studyPlanRepositoryProvider).bulkCreateCustomTopics(
            names: names,
            moduleName: _moduleController.text.trim().isEmpty ? null : _moduleController.text.trim(),
          );
      _bulkController.clear();
      ref.invalidate(customTopicsProvider);
      ref.invalidate(studyPlanAccessStatusProvider);
      ref.invalidate(studyPlanWeekProvider);
      setState(() {
        _adding = false;
        _bulkMode = false;
      });
    } catch (error) {
      if (apiErrorCode(error) == 'SUBSCRIPTION_REQUIRED') {
        await _promptSubscriptionRequired();
      } else {
        setState(() => _error = apiErrorMessage(error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(CustomTopicView topic) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove topic?'),
        content: Text('"${topic.name}" will be removed from your study plan.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Remove')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(studyPlanRepositoryProvider).deleteCustomTopic(topic.id);
      ref.invalidate(customTopicsProvider);
      ref.invalidate(studyPlanAccessStatusProvider);
      ref.invalidate(studyPlanWeekProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
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
    if (confirmed == true && mounted) {
      context.push('/pricing');
    }
  }

  @override
  Widget build(BuildContext context) {
    final topics = ref.watch(customTopicsProvider);
    final access = ref.watch(studyPlanAccessStatusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Topics'),
        actions: [
          IconButton(
            icon: Icon(_adding ? Icons.close : Icons.add),
            tooltip: _adding ? 'Cancel' : 'Add topic',
            onPressed: () => setState(() => _adding = !_adding),
          ),
        ],
      ),
      body: Column(
        children: [
          access.maybeWhen(
            data: (status) => status.hasActiveSubscription
                ? const SizedBox.shrink()
                : Container(
                    width: double.infinity,
                    color: AppColors.navy100,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Text(
                      '${status.customTopicCount}/${status.freeTopicLimit} free topics used',
                      style: const TextStyle(fontSize: 12, color: AppColors.navy900),
                    ),
                  ),
            orElse: () => const SizedBox.shrink(),
          ),
          if (_adding)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: SegmentedButton<bool>(
                          segments: const [
                            ButtonSegment(value: false, label: Text('Single')),
                            ButtonSegment(value: true, label: Text('Bulk paste')),
                          ],
                          selected: {_bulkMode},
                          onSelectionChanged: (s) => setState(() => _bulkMode = s.first),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _moduleController,
                    decoration: const InputDecoration(
                      hintText: 'Module/chapter name (optional)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (_bulkMode)
                    TextField(
                      controller: _bulkController,
                      maxLines: 6,
                      decoration: const InputDecoration(
                        hintText: 'One topic per line\ne.g.\nIndian Polity - Fundamental Rights\nModern History - 1857 Revolt',
                        border: OutlineInputBorder(),
                      ),
                    )
                  else
                    TextField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        hintText: 'Topic name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: _saving ? null : (_bulkMode ? _submitBulk : _submitSingle),
                    child: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                          )
                        : Text(_bulkMode ? 'Add topics' : 'Add topic'),
                  ),
                ],
              ),
            ),
          const Divider(height: 1, color: AppColors.line),
          Expanded(
            child: topics.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text(apiErrorMessage(error))),
              data: (list) {
                if (list.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.checklist, size: 40, color: AppColors.muted),
                          SizedBox(height: 10),
                          Text(
                            'No custom topics yet',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Add topics from your own syllabus — one at a time, or paste a '
                            'whole list at once under the same module name. Each topic is '
                            'automatically woven into your day-by-day Study Plan alongside '
                            'any course lessons, where you can mark it done or reschedule it '
                            'like any other task. The first 3 topics are free; beyond that '
                            'an active subscription plan is needed.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: AppColors.muted, fontSize: 12.5, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final t = list[i];
                    return Card(
                      margin: EdgeInsets.zero,
                      child: ListTile(
                        title: Text(t.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(
                          [
                            if (t.moduleName != null) t.moduleName!,
                            '${t.estimatedMinutes} min',
                          ].join(' · '),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: (t.scheduled ? AppColors.success : AppColors.danger).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                t.scheduled ? 'Scheduled' : 'Not yet scheduled',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: t.scheduled ? AppColors.success : AppColors.danger,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 20),
                              onPressed: () => _delete(t),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
