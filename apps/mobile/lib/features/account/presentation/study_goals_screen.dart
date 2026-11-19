import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../onboarding/data/onboarding_models.dart';
import '../../onboarding/data/onboarding_repository.dart';
import '../data/account_models.dart';
import '../data/account_repository.dart';

class StudyGoalsScreen extends ConsumerStatefulWidget {
  const StudyGoalsScreen({super.key, required this.goals});

  final StudyGoals goals;

  @override
  ConsumerState<StudyGoalsScreen> createState() => _StudyGoalsScreenState();
}

class _StudyGoalsScreenState extends ConsumerState<StudyGoalsScreen> {
  String? _examId;
  bool _ownExam = false;
  final _customExamController = TextEditingController();
  Qualification? _qualification;
  late int _dailyMinutes = widget.goals.dailyStudyMinutes ?? 60;
  DateTime? _targetDate;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _targetDate = widget.goals.targetDate;
    _ownExam = widget.goals.customExamName != null;
    _customExamController.text = widget.goals.customExamName ?? '';
    final raw = widget.goals.qualification;
    _qualification = Qualification.values
        .cast<Qualification?>()
        .firstWhere((q) => q?.wireValue == raw, orElse: () => null);
  }

  @override
  void dispose() {
    _customExamController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final customName = _customExamController.text.trim();
    if (_ownExam && customName.length < 2) {
      setState(() => _error = 'Type your exam name (at least 2 characters).');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref
          .read(accountRepositoryProvider)
          .updateGoals(
            targetExamId: _ownExam ? null : _examId,
            clearTargetExamId: _ownExam,
            customExamName: _ownExam ? customName : null,
            clearCustomExamName: !_ownExam,
            qualification: _qualification?.wireValue,
            dailyStudyMinutes: _dailyMinutes,
            targetDate: _targetDate,
          );
      ref.invalidate(studyGoalsProvider);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final exams = ref.watch(examsProvider);
    final hours = _dailyMinutes ~/ 60;
    final mins = _dailyMinutes % 60;

    return Scaffold(
      appBar: AppBar(title: const Text('Study Goals')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Target exam',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                TextButton(
                  onPressed: () => setState(() => _ownExam = !_ownExam),
                  child: Text(
                    _ownExam ? '← Pick from the list instead' : "My exam isn't listed",
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            if (_ownExam)
              TextField(
                controller: _customExamController,
                decoration: const InputDecoration(
                  hintText: 'Type your exam name',
                  border: OutlineInputBorder(),
                ),
              )
            else
              exams.when(
                loading: () => const LinearProgressIndicator(),
                error: (error, _) => Text(
                  apiErrorMessage(error),
                  style: const TextStyle(color: AppColors.danger),
                ),
                data: (list) => Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final exam in list)
                      ChoiceChip(
                        label: Text(exam.nameEn),
                        selected: _examId == exam.id ||
                            (_examId == null &&
                                exam.nameEn == widget.goals.targetExamNameEn),
                        onSelected: (_) => setState(() => _examId = exam.id),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 22),
            Text(
              'Qualification',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final q in Qualification.values)
                  ChoiceChip(
                    label: Text(q.label),
                    selected: _qualification == q,
                    onSelected: (_) => setState(() => _qualification = q),
                  ),
              ],
            ),
            const SizedBox(height: 22),
            Text(
              'Daily study time',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            Text(
              hours > 0 ? '${hours}h ${mins}m / day' : '${mins}m / day',
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            Slider(
              value: _dailyMinutes.toDouble(),
              min: 15,
              max: 480,
              divisions: 31,
              label: '$_dailyMinutes min',
              onChanged: (v) => setState(() => _dailyMinutes = v.round()),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _targetDate == null
                        ? 'No target date set'
                        : 'Target date: ${_targetDate!.day}/${_targetDate!.month}/${_targetDate!.year}',
                    style: const TextStyle(color: AppColors.muted),
                  ),
                ),
                TextButton(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _targetDate ??
                          DateTime.now().add(const Duration(days: 90)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 1825)),
                    );
                    if (picked != null) setState(() => _targetDate = picked);
                  },
                  child: const Text('Pick date'),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.danger.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
              ),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Save goals'),
            ),
          ],
        ),
      ),
    );
  }
}
