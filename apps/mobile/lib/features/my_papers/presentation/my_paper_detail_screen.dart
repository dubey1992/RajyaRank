import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/my_papers_models.dart';
import '../data/my_papers_repository.dart';

enum _Mode { view, take, result }

/// No single-paper GET endpoint exists on the API — same list the list
/// screen already fetched is reused here and filtered by id.
class MyPaperDetailScreen extends ConsumerStatefulWidget {
  const MyPaperDetailScreen({super.key, required this.paperId});

  final String paperId;

  @override
  ConsumerState<MyPaperDetailScreen> createState() => _MyPaperDetailScreenState();
}

class _MyPaperDetailScreenState extends ConsumerState<MyPaperDetailScreen> {
  _Mode _mode = _Mode.view;
  bool _busy = false;
  String? _attemptId;
  int _questionCount = 0;
  final Map<int, TextEditingController> _answerControllers = {};
  StudentPaperAttemptResult? _result;

  @override
  void dispose() {
    for (final c in _answerControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _openPaper() async {
    try {
      final url = await ref.read(myPapersRepositoryProvider).downloadUrl(widget.paperId);
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  Future<void> _startPractice() async {
    setState(() => _busy = true);
    try {
      final started = await ref.read(myPapersRepositoryProvider).startAttempt(widget.paperId);
      _answerControllers.clear();
      for (var i = 1; i <= started.questionCount; i++) {
        _answerControllers[i] = TextEditingController();
      }
      setState(() {
        _attemptId = started.attemptId;
        _questionCount = started.questionCount;
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
      final answers = <String, String>{};
      for (final entry in _answerControllers.entries) {
        final value = entry.value.text.trim();
        if (value.isNotEmpty) answers['${entry.key}'] = value.toUpperCase();
      }
      final result = await ref.read(myPapersRepositoryProvider).submitAttempt(_attemptId!, answers);
      ref.invalidate(myPapersProvider);
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
    final papers = ref.watch(myPapersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Paper')),
      body: papers.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text(apiErrorMessage(error))),
        data: (list) {
          StudentPaperView? paper;
          for (final p in list) {
            if (p.id == widget.paperId) {
              paper = p;
              break;
            }
          }
          if (paper == null) return const Center(child: Text('Paper not found.'));
          return switch (_mode) {
            _Mode.view => _buildView(paper),
            _Mode.take => _buildTake(paper),
            _Mode.result => _buildResult(paper),
          };
        },
      ),
    );
  }

  Widget _buildView(StudentPaperView paper) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(paper.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: [
              if (paper.year != null) _Badge(text: '${paper.year}'),
              if (paper.hasAnswerKey) const _Badge(text: 'Has answer key'),
              if (paper.questionCount != null) _Badge(text: '${paper.questionCount} questions'),
            ],
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(onPressed: _openPaper, icon: const Icon(Icons.picture_as_pdf_outlined), label: const Text('Open paper')),
          const SizedBox(height: 10),
          if (paper.questionCount == null)
            const Text('Add a question count when uploading to enable timed practice.', style: TextStyle(color: AppColors.muted))
          else
            ElevatedButton(
              onPressed: _busy ? null : _startPractice,
              child: _busy
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                  : const Text('Start timed practice'),
            ),
        ],
      ),
    );
  }

  Widget _buildTake(StudentPaperView paper) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: OutlinedButton.icon(onPressed: _openPaper, icon: const Icon(Icons.picture_as_pdf_outlined), label: const Text('Open paper')),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 4, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.1),
            itemCount: _questionCount,
            itemBuilder: (context, i) {
              final number = i + 1;
              return TextField(
                controller: _answerControllers[number],
                textAlign: TextAlign.center,
                maxLength: 3,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(labelText: '$number', border: const OutlineInputBorder(), counterText: ''),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(child: OutlinedButton(onPressed: () => setState(() => _mode = _Mode.view), child: const Text('Cancel'))),
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
        ),
      ],
    );
  }

  Widget _buildResult(StudentPaperView paper) {
    final result = _result;
    if (result == null) return const SizedBox.shrink();
    return Padding(
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
                  result.score != null ? '${result.score}/${result.maxScore}' : 'Submitted',
                  style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ),
          if (result.score == null) ...[
            const SizedBox(height: 10),
            const Text('No answer key — submitted for manual review.', style: TextStyle(color: AppColors.muted)),
          ],
          const SizedBox(height: 16),
          OutlinedButton(onPressed: () => setState(() => _mode = _Mode.view), child: const Text('Back')),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: AppColors.navy100, borderRadius: BorderRadius.circular(20)),
      child: Text(text, style: const TextStyle(fontSize: 11, color: AppColors.navy900, fontWeight: FontWeight.w600)),
    );
  }
}
