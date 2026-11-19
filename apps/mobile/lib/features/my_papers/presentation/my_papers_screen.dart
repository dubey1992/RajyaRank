import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/my_papers_repository.dart';

/// Previous-year-paper upload + self-paced practice — mobile mirror of
/// web's `/my-papers`. Free for any logged-in student, no subscription gate.
/// Not a digitized question bank: the PDF is opened separately, and this
/// app only captures an answer sheet (one text box per question number)
/// graded against an optional free-text answer key.
class MyPapersScreen extends ConsumerStatefulWidget {
  const MyPapersScreen({super.key});

  @override
  ConsumerState<MyPapersScreen> createState() => _MyPapersScreenState();
}

class _MyPapersScreenState extends ConsumerState<MyPapersScreen> {
  bool _uploading = false;
  bool _busy = false;
  String? _phase;
  String? _error;

  PlatformFile? _picked;
  final _titleController = TextEditingController();
  final _yearController = TextEditingController();
  final _questionCountController = TextEditingController();
  final _answerKeyController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _yearController.dispose();
    _questionCountController.dispose();
    _answerKeyController.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf'], withData: true);
    final file = result?.files.single;
    if (file?.bytes == null) return;
    setState(() => _picked = file);
  }

  Future<void> _submit() async {
    final file = _picked;
    final title = _titleController.text.trim();
    if (file == null || file.bytes == null) {
      setState(() => _error = 'Choose a PDF file.');
      return;
    }
    if (file.bytes!.length > 100 * 1024 * 1024) {
      setState(() => _error = 'File is too large (max 100MB).');
      return;
    }
    if (title.isEmpty) {
      setState(() => _error = 'Give the paper a title.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(myPapersRepositoryProvider).uploadPaper(
            fileName: file.name,
            mimeType: 'application/pdf',
            bytes: file.bytes!,
            title: title,
            year: int.tryParse(_yearController.text.trim()),
            questionCount: int.tryParse(_questionCountController.text.trim()),
            answerKeyText: _answerKeyController.text.trim().isEmpty ? null : _answerKeyController.text.trim(),
            onPhase: (phase) {
              if (mounted) setState(() => _phase = phase);
            },
          );
      ref.invalidate(myPapersProvider);
      setState(() {
        _uploading = false;
        _picked = null;
      });
      _titleController.clear();
      _yearController.clear();
      _questionCountController.clear();
      _answerKeyController.clear();
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _phase = null;
        });
      }
    }
  }

  Future<void> _delete(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove paper?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Remove')),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(myPapersRepositoryProvider).deletePaper(id);
      ref.invalidate(myPapersProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final papers = ref.watch(myPapersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Papers'),
        actions: [
          IconButton(
            icon: Icon(_uploading ? Icons.close : Icons.add),
            tooltip: _uploading ? 'Cancel' : 'Upload a paper',
            onPressed: () => setState(() => _uploading = !_uploading),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_uploading)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OutlinedButton.icon(
                    onPressed: _pickFile,
                    icon: const Icon(Icons.upload_file),
                    label: Text(_picked?.name ?? 'Choose PDF'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _titleController,
                    decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _yearController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Year (optional)', border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _questionCountController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Question count (optional)', border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _answerKeyController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Answer key (optional)',
                      hintText: 'e.g. 1:A, 2:C, 3:B or one per line',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Leave this blank if you don\'t have one — you can still practice and '
                    'self-review, you just won\'t get an automatic score.',
                    style: TextStyle(color: AppColors.muted, fontSize: 11),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white)),
                              const SizedBox(width: 10),
                              Text(_phase ?? 'Uploading…'),
                            ],
                          )
                        : const Text('Upload'),
                  ),
                ],
              ),
            ),
          const Divider(height: 1, color: AppColors.line),
          Expanded(
            child: papers.when(
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
                          Icon(Icons.description_outlined, size: 40, color: AppColors.muted),
                          SizedBox(height: 10),
                          Text(
                            'No papers yet',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Upload a PDF of any previous-year paper you already have. You '
                            'read the paper in its own viewer and fill in your answers on a '
                            'simple answer sheet alongside it — this isn\'t a digitised '
                            'question bank. Add an answer key when uploading to get an '
                            'instant score, or skip it and self-review afterwards.',
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
                    final p = list[i];
                    return Card(
                      margin: EdgeInsets.zero,
                      child: ListTile(
                        title: Text(p.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text([
                          if (p.year != null) '${p.year}',
                          if (p.hasAnswerKey) 'Has answer key',
                          if (p.questionCount != null) '${p.questionCount} questions',
                        ].join(' · ')),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (p.bestScore != null)
                              Text('${p.bestScore!.round()}%', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.success)),
                            IconButton(icon: const Icon(Icons.delete_outline, size: 20), onPressed: () => _delete(p.id)),
                          ],
                        ),
                        onTap: () => context.push('/my-papers/${p.id}'),
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
