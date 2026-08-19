import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/test_models.dart';
import '../data/test_repository.dart';

const _submitGraceSeconds = 5 * 60;

class RunnerArgs {
  const RunnerArgs({required this.titleEn, required this.attempt});

  final String titleEn;
  final StartAttemptResponse attempt;
}

class _FlatQuestion {
  const _FlatQuestion({required this.sectionName, required this.question});

  final String sectionName;
  final AttemptQuestion question;
}

class TestRunnerScreen extends ConsumerStatefulWidget {
  const TestRunnerScreen({super.key, required this.args});

  final RunnerArgs args;

  @override
  ConsumerState<TestRunnerScreen> createState() => _TestRunnerScreenState();
}

class _TestRunnerScreenState extends ConsumerState<TestRunnerScreen> {
  late final List<_FlatQuestion> _flat;
  final Map<String, Object?> _responses = {};
  final Map<String, bool> _marked = {};
  final Map<String, int> _timeSpentMs = {};
  int _sequenceNo = 0;
  int _currentIndex = 0;
  String? _activeQid;
  DateTime? _enteredAt;
  late int _remainingSeconds;
  Timer? _timer;
  bool _submitting = false;
  bool _submitted = false;
  AttemptResult? _result;

  String get _attemptId => widget.args.attempt.attemptId;

  @override
  void initState() {
    super.initState();
    _flat = [
      for (final section in widget.args.attempt.sections)
        for (final question in section.questions)
          _FlatQuestion(sectionName: section.nameEn, question: question),
    ];
    _remainingSeconds = widget.args.attempt.expiresAt
        .difference(DateTime.now())
        .inSeconds
        .clamp(0, 1 << 30);
    if (_flat.isNotEmpty) {
      _activeQid = _flat[0].question.questionVersionId;
      _enteredAt = DateTime.now();
    }
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _tick() {
    if (_submitted) return;
    setState(() => _remainingSeconds = (_remainingSeconds - 1).clamp(0, 1 << 30));
    if (_remainingSeconds <= 0) {
      _timer?.cancel();
      _submit(auto: true);
    }
  }

  void _flushElapsed() {
    if (_activeQid == null || _enteredAt == null) return;
    final elapsed = DateTime.now().difference(_enteredAt!).inMilliseconds;
    _timeSpentMs[_activeQid!] = (_timeSpentMs[_activeQid!] ?? 0) + elapsed;
    _enteredAt = DateTime.now();
  }

  void _goTo(int index) {
    if (index < 0 || index >= _flat.length) return;
    _flushElapsed();
    setState(() => _currentIndex = index);
    _activeQid = _flat[index].question.questionVersionId;
    _enteredAt = DateTime.now();
  }

  void _save(String qid, {required Object? response, required bool marked}) {
    _flushElapsed();
    setState(() {
      _responses[qid] = response;
      _marked[qid] = marked;
    });
    final seq = _sequenceNo++;
    final timeSpent = _timeSpentMs[qid] ?? 0;
    unawaited(
      ref
          .read(testRepositoryProvider)
          .saveAnswer(
            _attemptId,
            qid,
            response: response,
            markedForReview: marked,
            sequenceNo: seq,
            timeSpentMs: timeSpent,
          )
          .catchError((_) {}),
    );
  }

  bool get _allAnswered =>
      _flat.every((f) => _responses[f.question.questionVersionId] != null);

  bool get _canSubmit => _allAnswered || _remainingSeconds <= _submitGraceSeconds;

  Future<void> _submit({bool auto = false}) async {
    if (_submitted || _submitting) return;
    _flushElapsed();
    setState(() => _submitting = true);
    try {
      final result = await ref.read(testRepositoryProvider).submit(_attemptId);
      _submitted = true;
      if (mounted) {
        setState(() {
          _result = result;
          _submitting = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  Future<void> _confirmSubmit() async {
    final unanswered = _flat.length -
        _flat.where((f) => _responses[f.question.questionVersionId] != null).length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Submit test?'),
        content: Text(
          unanswered > 0
              ? 'You have $unanswered unanswered question(s). Once submitted, you cannot change your answers.'
              : 'Once submitted, you cannot change your answers.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (confirmed == true) _submit();
  }

  @override
  Widget build(BuildContext context) {
    if (_result != null) {
      return _ResultSummaryScreen(
        titleEn: widget.args.titleEn,
        result: _result!,
        onViewReview: () =>
            context.pushReplacement('/tests/review/$_attemptId'),
      );
    }

    if (_flat.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.args.titleEn)),
        body: const Center(child: Text('This test has no questions.')),
      );
    }

    final current = _flat[_currentIndex];
    final qid = current.question.questionVersionId;
    final minutes = (_remainingSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_remainingSeconds % 60).toString().padLeft(2, '0');
    final lowTime = _remainingSeconds <= _submitGraceSeconds;

    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.args.titleEn, overflow: TextOverflow.ellipsis),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Text(
                  '$minutes:$seconds',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: lowTime ? AppColors.orange100 : Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
        body: Column(
          children: [
            SizedBox(
              height: 56,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: _flat.length,
                separatorBuilder: (_, _) => const SizedBox(width: 6),
                itemBuilder: (context, i) {
                  final fq = _flat[i];
                  final fqid = fq.question.questionVersionId;
                  final isCurrent = i == _currentIndex;
                  final isMarked = _marked[fqid] ?? false;
                  final isAnswered = _responses[fqid] != null;
                  final Color color = isCurrent
                      ? AppColors.navy900
                      : isMarked
                      ? AppColors.orange500
                      : isAnswered
                      ? AppColors.teal500
                      : Colors.white;
                  final Color textColor =
                      isCurrent || isMarked || isAnswered
                      ? Colors.white
                      : AppColors.ink;
                  return GestureDetector(
                    onTap: () => _goTo(i),
                    child: Container(
                      width: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Text(
                        '${i + 1}',
                        style: TextStyle(color: textColor, fontWeight: FontWeight.w600),
                      ),
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1, color: AppColors.line),
            Expanded(
              child: SingleChildScrollView(
                key: ValueKey(qid),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Question ${_currentIndex + 1} of ${_flat.length}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '+${current.question.marks.toStringAsFixed(0)}'
                          '${current.question.negativeMarks > 0 ? ' / -${current.question.negativeMarks.toStringAsFixed(0)}' : ''}',
                          style: const TextStyle(
                            color: AppColors.muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      current.question.textEn,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 18),
                    _AnswerInput(
                      question: current.question,
                      response: _responses[qid],
                      onChanged: (value) =>
                          _save(qid, response: value, marked: _marked[qid] ?? false),
                    ),
                  ],
                ),
              ),
            ),
            const Divider(height: 1, color: AppColors.line),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  if (_currentIndex > 0)
                    IconButton(
                      onPressed: () => _goTo(_currentIndex - 1),
                      icon: const Icon(Icons.chevron_left),
                    ),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _save(
                        qid,
                        response: _responses[qid],
                        marked: !(_marked[qid] ?? false),
                      ),
                      child: Text(
                        (_marked[qid] ?? false) ? 'Unmark' : 'Mark for review',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (_currentIndex < _flat.length - 1)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _goTo(_currentIndex + 1),
                        child: const Text('Next'),
                      ),
                    )
                  else
                    Expanded(
                      child: ElevatedButton(
                        onPressed: (_canSubmit && !_submitting)
                            ? _confirmSubmit
                            : null,
                        child: _submitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Submit test'),
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

class _AnswerInput extends StatefulWidget {
  const _AnswerInput({
    required this.question,
    required this.response,
    required this.onChanged,
  });

  final AttemptQuestion question;
  final Object? response;
  final ValueChanged<Object?> onChanged;

  @override
  State<_AnswerInput> createState() => _AnswerInputState();
}

class _AnswerInputState extends State<_AnswerInput> {
  late final TextEditingController _numericController;

  @override
  void initState() {
    super.initState();
    _numericController = TextEditingController(
      text: widget.response?.toString() ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant _AnswerInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.question.questionVersionId != widget.question.questionVersionId) {
      _numericController.text = widget.response?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    _numericController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final question = widget.question;

    if (question.type == QuestionType.numeric) {
      return TextField(
        controller: _numericController,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: const InputDecoration(labelText: 'Your answer'),
        onChanged: (text) => widget.onChanged(num.tryParse(text)),
      );
    }

    if (question.type == QuestionType.match) {
      return const Text(
        "This question type isn't supported in the app yet — please use "
        'the web app to answer it, or skip and come back on web.',
        style: TextStyle(color: AppColors.muted),
      );
    }

    if (question.type == QuestionType.multipleChoice) {
      final selected = (widget.response as List?)?.cast<String>() ?? const [];
      return Column(
        children: [
          for (final option in question.options)
            _OptionTile(
              label: option.en,
              selected: selected.contains(option.key),
              onTap: () {
                final next = List<String>.from(selected);
                if (next.contains(option.key)) {
                  next.remove(option.key);
                } else {
                  next.add(option.key);
                }
                widget.onChanged(next.isEmpty ? null : next);
              },
            ),
        ],
      );
    }

    // SINGLE_CHOICE / TRUE_FALSE / PASSAGE / ASSERTION_REASON share the same
    // single-key-string wire shape — render as a radio group.
    final selectedKey = widget.response as String?;
    return Column(
      children: [
        for (final option in question.options)
          _OptionTile(
            label: option.en,
            selected: selectedKey == option.key,
            onTap: () => widget.onChanged(option.key),
          ),
      ],
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.navy100 : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? AppColors.navy900 : AppColors.line,
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected ? Icons.check_circle : Icons.circle_outlined,
                size: 20,
                color: selected ? AppColors.navy900 : AppColors.muted,
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(label)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ResultSummaryScreen extends StatelessWidget {
  const _ResultSummaryScreen({
    required this.titleEn,
    required this.result,
    required this.onViewReview,
  });

  final String titleEn;
  final AttemptResult result;
  final VoidCallback onViewReview;

  @override
  Widget build(BuildContext context) {
    final percent = result.maxScore > 0
        ? (result.score / result.maxScore * 100).round()
        : 0;
    return PopScope(
      canPop: false,
      child: Scaffold(
        appBar: AppBar(title: Text(titleEn), automaticallyImplyLeading: false),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Column(
                children: [
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: result.passed == false
                            ? AppColors.danger
                            : AppColors.teal500,
                        width: 6,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '$percent%',
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (result.passed != null)
                    Text(
                      result.passed! ? 'Passed' : 'Not passed',
                      style: TextStyle(
                        color: result.passed! ? AppColors.success : AppColors.danger,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: _StatBox(
                    label: 'Correct',
                    value: '${result.correctCount}',
                    color: AppColors.success,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatBox(
                    label: 'Incorrect',
                    value: '${result.incorrectCount}',
                    color: AppColors.danger,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatBox(
                    label: 'Unanswered',
                    value: '${result.unansweredCount}',
                    color: AppColors.muted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (result.rank != null || result.percentile != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      if (result.rank != null)
                        _MiniStat(label: 'Rank', value: '#${result.rank}'),
                      if (result.percentile != null)
                        _MiniStat(
                          label: 'Percentile',
                          value: result.percentile!.toStringAsFixed(0),
                        ),
                      _MiniStat(
                        label: 'Attempts',
                        value: '${result.totalAttempts}',
                      ),
                    ],
                  ),
                ),
              ),
            if (result.subjectAnalysis.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                'Subject-wise',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 10),
              for (final s in result.subjectAnalysis)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${s.subject}  (${s.correct}/${s.total})'),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: s.total > 0 ? s.correct / s.total : 0,
                          minHeight: 8,
                          backgroundColor: AppColors.line,
                          color: AppColors.teal500,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: onViewReview,
              child: const Text('View detailed review'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Back to home'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
      ],
    );
  }
}
