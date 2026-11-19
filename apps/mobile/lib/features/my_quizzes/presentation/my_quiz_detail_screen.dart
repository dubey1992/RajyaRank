import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/my_quizzes_models.dart';
import '../data/my_quizzes_repository.dart';

enum _Mode { edit, take, result }

const _builderTypes = [
  QuestionType.singleChoice,
  QuestionType.multipleChoice,
  QuestionType.trueFalse,
  QuestionType.numeric,
];

T? _firstOrNull<T>(Iterable<T> it) {
  for (final e in it) {
    return e;
  }
  return null;
}

String _typeLabel(QuestionType t) => switch (t) {
  QuestionType.singleChoice => 'Single choice',
  QuestionType.multipleChoice => 'Multiple choice',
  QuestionType.trueFalse => 'True / False',
  QuestionType.numeric => 'Numeric',
  _ => 'Other',
};

const _bulkTemplate = '''Q: Capital of India?
A) Mumbai
B) Delhi
Answer: B
Explanation: optional
---
Q: Next question...''';

class MyQuizDetailScreen extends ConsumerStatefulWidget {
  const MyQuizDetailScreen({super.key, required this.quizId});

  final String quizId;

  @override
  ConsumerState<MyQuizDetailScreen> createState() => _MyQuizDetailScreenState();
}

class _MyQuizDetailScreenState extends ConsumerState<MyQuizDetailScreen> {
  _Mode _mode = _Mode.edit;
  bool _showAddForm = false;
  bool _showBulk = false;
  bool _busy = false;
  String? _error;

  // Add-question form state
  QuestionType _newType = QuestionType.singleChoice;
  final _questionTextController = TextEditingController();
  final _explanationController = TextEditingController();
  final _numericController = TextEditingController();
  final List<TextEditingController> _optionControllers = [TextEditingController(), TextEditingController()];
  final Set<int> _correctOptionIndexes = {};
  bool _trueFalseAnswer = true;

  // Bulk import
  final _bulkController = TextEditingController();
  BulkImportResult? _bulkResult;

  // Take-attempt state
  String? _attemptId;
  List<TakeQuestion> _takeQuestions = const [];
  final Map<String, dynamic> _answers = {};
  PersonalQuizAttemptResult? _result;

  @override
  void dispose() {
    _questionTextController.dispose();
    _explanationController.dispose();
    _numericController.dispose();
    for (final c in _optionControllers) {
      c.dispose();
    }
    _bulkController.dispose();
    super.dispose();
  }

  void _resetAddForm() {
    _questionTextController.clear();
    _explanationController.clear();
    _numericController.clear();
    for (final c in _optionControllers) {
      c.clear();
    }
    _optionControllers
      ..clear()
      ..addAll([TextEditingController(), TextEditingController()]);
    _correctOptionIndexes.clear();
    _trueFalseAnswer = true;
    _newType = QuestionType.singleChoice;
  }

  Future<void> _addQuestion() async {
    final text = _questionTextController.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Add the question text.');
      return;
    }

    List<PersonalQuizOption> options = const [];
    dynamic correctAnswer;

    if (_newType == QuestionType.numeric) {
      final value = num.tryParse(_numericController.text.trim());
      if (value == null) {
        setState(() => _error = 'Enter a valid number.');
        return;
      }
      correctAnswer = {'value': value};
    } else if (_newType == QuestionType.trueFalse) {
      options = [PersonalQuizOption(key: 'TRUE', text: 'True'), PersonalQuizOption(key: 'FALSE', text: 'False')];
      correctAnswer = [_trueFalseAnswer ? 'TRUE' : 'FALSE'];
    } else {
      final keys = ['A', 'B', 'C', 'D', 'E', 'F'];
      final nonEmpty = <PersonalQuizOption>[];
      final correctKeys = <String>[];
      for (var i = 0; i < _optionControllers.length; i++) {
        final t = _optionControllers[i].text.trim();
        if (t.isEmpty) continue;
        final key = keys[i];
        nonEmpty.add(PersonalQuizOption(key: key, text: t));
        if (_correctOptionIndexes.contains(i)) correctKeys.add(key);
      }
      if (nonEmpty.length < 2) {
        setState(() => _error = 'Add at least 2 options.');
        return;
      }
      if (correctKeys.isEmpty) {
        setState(() => _error = 'Mark at least one option as correct.');
        return;
      }
      options = nonEmpty;
      correctAnswer = correctKeys;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(myQuizzesRepositoryProvider).addQuestion(
            quizId: widget.quizId,
            type: _newType,
            text: text,
            options: options,
            correctAnswer: correctAnswer,
            explanation: _explanationController.text.trim().isEmpty ? null : _explanationController.text.trim(),
          );
      ref.invalidate(personalQuizDetailProvider(widget.quizId));
      ref.invalidate(myQuizzesProvider);
      _resetAddForm();
      setState(() => _showAddForm = false);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _removeQuestion(String questionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove question?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Remove')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(myQuizzesRepositoryProvider).deleteQuestion(widget.quizId, questionId);
      ref.invalidate(personalQuizDetailProvider(widget.quizId));
      ref.invalidate(myQuizzesProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  Future<void> _pickTextFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['txt'],
      withData: true,
    );
    final bytes = result?.files.single.bytes;
    if (bytes == null) return;
    setState(() => _bulkController.text = utf8.decode(bytes));
  }

  Future<void> _submitBulkImport() async {
    final text = _bulkController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _busy = true;
      _bulkResult = null;
    });
    try {
      final result = await ref.read(myQuizzesRepositoryProvider).bulkImport(widget.quizId, text);
      setState(() => _bulkResult = result);
      if (result.imported > 0) {
        _bulkController.clear();
        ref.invalidate(personalQuizDetailProvider(widget.quizId));
        ref.invalidate(myQuizzesProvider);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startTake() async {
    setState(() => _busy = true);
    try {
      final started = await ref.read(myQuizzesRepositoryProvider).startAttempt(widget.quizId);
      setState(() {
        _attemptId = started.attemptId;
        _takeQuestions = started.questions;
        _answers.clear();
        _mode = _Mode.take;
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitAttempt() async {
    if (_attemptId == null) return;
    setState(() => _busy = true);
    try {
      final result = await ref.read(myQuizzesRepositoryProvider).submitAttempt(_attemptId!, _answers);
      ref.invalidate(myQuizzesProvider);
      setState(() {
        _result = result;
        _mode = _Mode.result;
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(personalQuizDetailProvider(widget.quizId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detail.maybeWhen(data: (d) => d.title, orElse: () => 'Practice Test')),
      ),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(apiErrorMessage(error))),
        data: (quiz) => switch (_mode) {
          _Mode.edit => _buildEditMode(quiz),
          _Mode.take => _buildTakeMode(),
          _Mode.result => _buildResultMode(quiz),
        },
      ),
    );
  }

  Widget _buildEditMode(PersonalQuizDetail quiz) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (quiz.questions.isEmpty)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text(
                'Add at least one question to take this test. Use "Add question" for '
                'single/multiple choice, true-false, or numeric answers, or "Bulk import" '
                'to add many at once from a pasted block or a .txt file.',
                style: TextStyle(color: AppColors.muted, fontSize: 12.5, height: 1.4),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _showBulk = !_showBulk),
                  child: Text(_showBulk ? 'Hide bulk import' : 'Bulk import'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _showAddForm = !_showAddForm),
                  child: Text(_showAddForm ? 'Hide form' : 'Add question'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ElevatedButton(
            onPressed: (_busy || quiz.questionCount == 0) ? null : _startTake,
            child: Text(quiz.questionCount == 0 ? 'Add a question to take the test' : 'Take test'),
          ),
          if (_showBulk) ...[
            const SizedBox(height: 16),
            const Text('Paste questions or upload a .txt file', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            const Text(
              'One answer key letter = single choice, more than one (comma-separated) = '
              'multiple choice. "---" between questions is optional. Each question is '
              'checked and saved on its own, so a mistake in one block never blocks the rest.',
              style: TextStyle(color: AppColors.muted, fontSize: 11.5, height: 1.35),
            ),
            const SizedBox(height: 8),
            Text(_bulkTemplate, style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.muted)),
            const SizedBox(height: 8),
            TextField(
              controller: _bulkController,
              maxLines: 8,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _pickTextFile,
                  icon: const Icon(Icons.upload_file, size: 16),
                  label: const Text('Upload .txt'),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: _busy ? null : _submitBulkImport,
                  child: _busy
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                      : const Text('Import'),
                ),
              ],
            ),
            if (_bulkResult != null) ...[
              const SizedBox(height: 8),
              Text('${_bulkResult!.imported} question(s) imported.', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w700)),
              for (final e in _bulkResult!.errors)
                Text('Block ${e.block}: ${e.message}', style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
            ],
          ],
          if (_showAddForm) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            _buildAddForm(),
          ],
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 8),
          Text('Questions (${quiz.questions.length})', style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          for (var i = 0; i < quiz.questions.length; i++) _QuestionListTile(index: i, question: quiz.questions[i], onRemove: () => _removeQuestion(quiz.questions[i].id)),
        ],
      ),
    );
  }

  Widget _buildAddForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<QuestionType>(
          initialValue: _newType,
          decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
          items: [for (final t in _builderTypes) DropdownMenuItem(value: t, child: Text(_typeLabel(t)))],
          onChanged: (t) => setState(() => _newType = t ?? QuestionType.singleChoice),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _questionTextController,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Question text', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 10),
        if (_newType == QuestionType.numeric)
          TextField(
            controller: _numericController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Correct answer (number)', border: OutlineInputBorder()),
          )
        else if (_newType == QuestionType.trueFalse)
          RadioGroup<bool>(
            groupValue: _trueFalseAnswer,
            onChanged: (v) => setState(() => _trueFalseAnswer = v ?? true),
            child: Row(
              children: const [
                Expanded(child: RadioListTile<bool>(value: true, title: Text('True'))),
                Expanded(child: RadioListTile<bool>(value: false, title: Text('False'))),
              ],
            ),
          )
        else
          RadioGroup<int>(
            groupValue: _correctOptionIndexes.isEmpty ? null : _correctOptionIndexes.first,
            onChanged: (v) => setState(() {
              _correctOptionIndexes.clear();
              if (v != null) _correctOptionIndexes.add(v);
            }),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < _optionControllers.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        _newType == QuestionType.multipleChoice
                            ? Checkbox(
                                value: _correctOptionIndexes.contains(i),
                                onChanged: (v) => setState(() {
                                  if (v == true) {
                                    _correctOptionIndexes.add(i);
                                  } else {
                                    _correctOptionIndexes.remove(i);
                                  }
                                }),
                              )
                            : Radio<int>(value: i),
                        Expanded(
                          child: TextField(
                            controller: _optionControllers[i],
                            decoration: InputDecoration(hintText: 'Option ${String.fromCharCode(65 + i)}', border: const OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                  ),
                if (_optionControllers.length < 6)
                  TextButton(
                    onPressed: () => setState(() => _optionControllers.add(TextEditingController())),
                    child: const Text('+ Add option'),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 10),
        TextField(
          controller: _explanationController,
          maxLines: 2,
          decoration: const InputDecoration(labelText: 'Explanation (optional)', border: OutlineInputBorder()),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: AppColors.danger)),
        ],
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: _busy ? null : _addQuestion,
          child: _busy
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
              : const Text('Add'),
        ),
      ],
    );
  }

  Widget _buildTakeMode() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < _takeQuestions.length; i++) _TakeQuestionCard(
            index: i,
            question: _takeQuestions[i],
            answer: _answers[_takeQuestions[i].id],
            onChanged: (value) => setState(() => _answers[_takeQuestions[i].id] = value),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _mode = _Mode.edit),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton(
                  onPressed: _busy ? null : _submitAttempt,
                  child: _busy
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                      : const Text('Submit'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResultMode(PersonalQuizDetail quiz) {
    final result = _result;
    if (result == null) return const SizedBox.shrink();
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: AppColors.navy900,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: Text(
                  '${result.score}/${result.maxScore}',
                  style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),
          if (result.revisionScheduledFor != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.navy100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Added a revision session for this topic on ${result.revisionScheduledFor} — see Study Plan.',
                style: const TextStyle(color: AppColors.navy900),
              ),
            ),
          ],
          const SizedBox(height: 16),
          for (final q in _takeQuestions)
            _ResultQuestionCard(
              question: q,
              breakdown: _firstOrNull(result.breakdown.where((b) => b.questionId == q.id)),
            ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => setState(() => _mode = _Mode.edit),
            child: const Text('Back'),
          ),
        ],
      ),
    );
  }
}

class _QuestionListTile extends StatelessWidget {
  const _QuestionListTile({required this.index, required this.question, required this.onRemove});

  final int index;
  final PersonalQuizQuestionEditView question;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(radius: 14, child: Text('${index + 1}', style: const TextStyle(fontSize: 12))),
        title: Text(question.text),
        subtitle: Row(
          children: [
            Text(_typeLabel(question.type), style: const TextStyle(fontSize: 11, color: AppColors.muted)),
            if (question.generatedByAi) ...[
              const SizedBox(width: 6),
              const Text('AI-generated', style: TextStyle(fontSize: 10, color: AppColors.orange500)),
            ],
          ],
        ),
        trailing: IconButton(icon: const Icon(Icons.delete_outline, size: 20), onPressed: onRemove),
      ),
    );
  }
}

class _TakeQuestionCard extends StatelessWidget {
  const _TakeQuestionCard({required this.index, required this.question, required this.answer, required this.onChanged});

  final int index;
  final TakeQuestion question;
  final dynamic answer;
  final ValueChanged<dynamic> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${index + 1}. ${question.text}', style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (question.type == QuestionType.numeric)
              TextField(
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Your answer', border: OutlineInputBorder()),
                onChanged: (text) => onChanged(num.tryParse(text)),
              )
            else if (question.type == QuestionType.multipleChoice)
              for (final opt in question.options)
                CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(opt.text),
                  value: (answer as List<String>?)?.contains(opt.key) ?? false,
                  onChanged: (checked) {
                    final current = List<String>.from((answer as List<String>?) ?? const []);
                    if (checked == true) {
                      current.add(opt.key);
                    } else {
                      current.remove(opt.key);
                    }
                    onChanged(current);
                  },
                )
            else
              RadioGroup<String>(
                groupValue: _firstOrNull((answer as List<String>?) ?? const <String>[]),
                onChanged: (key) => onChanged(key == null ? null : [key]),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final opt in question.options)
                      RadioListTile<String>(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(opt.text),
                        value: opt.key,
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

class _ResultQuestionCard extends StatelessWidget {
  const _ResultQuestionCard({required this.question, required this.breakdown});

  final TakeQuestion question;
  final QuestionBreakdown? breakdown;

  @override
  Widget build(BuildContext context) {
    final correct = breakdown?.correct ?? false;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: correct ? AppColors.success : AppColors.danger, width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(question.text, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(
              correct ? '✓ Correct' : '✗ Incorrect',
              style: TextStyle(color: correct ? AppColors.success : AppColors.danger, fontWeight: FontWeight.w700),
            ),
            if (breakdown?.explanation != null) ...[
              const SizedBox(height: 4),
              Text(breakdown!.explanation!, style: const TextStyle(color: AppColors.muted, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}
