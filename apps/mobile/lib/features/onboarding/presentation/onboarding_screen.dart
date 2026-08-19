import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../dashboard/data/dashboard_repository.dart';
import '../data/onboarding_models.dart';
import '../data/onboarding_repository.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  final _accessCodeController = TextEditingController();
  int _step = 0;
  static const _totalSteps = 5;

  String? _stateId;
  String? _examId;
  Qualification? _qualification;
  int _dailyMinutes = 60;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _pageController.dispose();
    _accessCodeController.dispose();
    super.dispose();
  }

  bool get _canAdvance => switch (_step) {
    0 => _stateId != null,
    1 => _examId != null,
    2 => _qualification != null,
    3 => true,
    _ => true,
  };

  Future<void> _goTo(int step) async {
    HapticFeedback.selectionClick();
    setState(() => _step = step);
    await _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _next() async {
    if (!_canAdvance) return;
    if (_step == _totalSteps - 1) {
      await _finish();
      return;
    }
    await _goTo(_step + 1);
  }

  Future<void> _finish({String? accessCode}) async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref
          .read(onboardingRepositoryProvider)
          .submit(
            stateId: _stateId!,
            targetExamId: _examId!,
            qualification: _qualification!,
            dailyStudyMinutes: _dailyMinutes,
          );
      final code = accessCode ?? _accessCodeController.text.trim();
      if (code.isNotEmpty) {
        try {
          await ref.read(onboardingRepositoryProvider).joinInstitution(code);
        } catch (_) {
          // Invalid/expired institute code shouldn't block onboarding
          // completion — the student can join later from Account.
        }
      }
      if (mounted) {
        ref.invalidate(dashboardProvider);
        context.go('/dashboard');
      }
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _skip() async {
    setState(() => _submitting = true);
    try {
      await ref.read(onboardingRepositoryProvider).skip();
      if (mounted) context.go('/dashboard');
    } catch (error) {
      setState(() {
        _submitting = false;
        _error = apiErrorMessage(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: List.generate(_totalSteps, (i) {
                        final active = i <= _step;
                        return Expanded(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            margin: EdgeInsets.only(
                              right: i == _totalSteps - 1 ? 0 : 6,
                            ),
                            height: 5,
                            decoration: BoxDecoration(
                              color: active
                                  ? AppColors.navy900
                                  : AppColors.line,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(width: 12),
                  TextButton(
                    onPressed: _submitting ? null : _skip,
                    child: const Text('Skip'),
                  ),
                ],
              ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ),
              ),
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _StateStep(
                    selected: _stateId,
                    onSelect: (id) => setState(() => _stateId = id),
                  ),
                  _ExamStep(
                    selected: _examId,
                    onSelect: (id) => setState(() => _examId = id),
                  ),
                  _QualificationStep(
                    selected: _qualification,
                    onSelect: (q) => setState(() => _qualification = q),
                  ),
                  _StudyTimeStep(
                    minutes: _dailyMinutes,
                    onChanged: (m) => setState(() => _dailyMinutes = m),
                  ),
                  _InstituteCodeStep(controller: _accessCodeController),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Row(
                children: [
                  if (_step > 0)
                    OutlinedButton(
                      onPressed: _submitting ? null : () => _goTo(_step - 1),
                      child: const Text('Back'),
                    ),
                  if (_step > 0) const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: (!_canAdvance || _submitting) ? null : _next,
                      child: _submitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              _step == _totalSteps - 1 ? 'Finish' : 'Continue',
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepScaffold extends StatelessWidget {
  const _StepScaffold({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: AppColors.muted)),
          const SizedBox(height: 24),
          child,
        ],
      ),
    );
  }
}

class _StateStep extends ConsumerWidget {
  const _StateStep({required this.selected, required this.onSelect});
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final states = ref.watch(statesProvider);
    return _StepScaffold(
      title: 'Where are you preparing from?',
      subtitle: 'This helps us surface the right state-level exams for you.',
      child: states.when(
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: CircularProgressIndicator(),
          ),
        ),
        error: (e, _) => Text(
          apiErrorMessage(e),
          style: const TextStyle(color: AppColors.danger),
        ),
        data: (list) => _OptionList(
          items: [for (final s in list) (id: s.id, label: s.nameEn)],
          selected: selected,
          onSelect: onSelect,
        ),
      ),
    );
  }
}

class _ExamStep extends ConsumerWidget {
  const _ExamStep({required this.selected, required this.onSelect});
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final exams = ref.watch(examsProvider);
    return _StepScaffold(
      title: 'Which exam are you targeting?',
      subtitle: 'Your dashboard and study plan build around this exam.',
      child: exams.when(
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: CircularProgressIndicator(),
          ),
        ),
        error: (e, _) => Text(
          apiErrorMessage(e),
          style: const TextStyle(color: AppColors.danger),
        ),
        data: (list) => _OptionList(
          items: [for (final e in list) (id: e.id, label: e.nameEn)],
          selected: selected,
          onSelect: onSelect,
        ),
      ),
    );
  }
}

class _QualificationStep extends StatelessWidget {
  const _QualificationStep({required this.selected, required this.onSelect});
  final Qualification? selected;
  final ValueChanged<Qualification> onSelect;

  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      title: "What's your current qualification?",
      subtitle: 'We use this to recommend the right starting difficulty.',
      child: Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [
          for (final q in Qualification.values)
            ChoiceChip(
              label: Text(q.label),
              selected: selected == q,
              onSelected: (_) {
                HapticFeedback.selectionClick();
                onSelect(q);
              },
            ),
        ],
      ),
    );
  }
}

class _StudyTimeStep extends StatelessWidget {
  const _StudyTimeStep({required this.minutes, required this.onChanged});
  final int minutes;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    return _StepScaffold(
      title: 'How much can you study daily?',
      subtitle: "We'll fit your study plan into this budget — you can change it later.",
      child: Column(
        children: [
          Text(
            hours > 0 ? '${hours}h ${mins}m / day' : '${mins}m / day',
            style: Theme.of(context).textTheme.headlineMedium
                ?.copyWith(color: AppColors.navy900),
          ),
          Slider(
            value: minutes.toDouble(),
            min: 15,
            max: 480,
            divisions: 31,
            label: '$minutes min',
            onChanged: (v) => onChanged(v.round()),
          ),
        ],
      ),
    );
  }
}

class _InstituteCodeStep extends StatelessWidget {
  const _InstituteCodeStep({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return _StepScaffold(
      title: 'Joining through an institute?',
      subtitle: "If your coaching institute gave you an access code, enter it here. Otherwise, just tap Finish.",
      child: TextField(
        controller: controller,
        textCapitalization: TextCapitalization.characters,
        decoration: const InputDecoration(
          labelText: 'Institute access code (optional)',
        ),
      ),
    );
  }
}

class _OptionList extends StatelessWidget {
  const _OptionList({
    required this.items,
    required this.selected,
    required this.onSelect,
  });

  final List<({String id, String label})> items;
  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () {
                HapticFeedback.selectionClick();
                onSelect(item.id);
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: selected == item.id ? AppColors.navy100 : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected == item.id
                        ? AppColors.navy900
                        : AppColors.line,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(child: Text(item.label)),
                    if (selected == item.id)
                      const Icon(
                        Icons.check_circle,
                        color: AppColors.navy900,
                        size: 20,
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
