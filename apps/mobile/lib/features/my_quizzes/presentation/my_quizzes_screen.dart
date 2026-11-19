import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../study_plan/data/study_plan_repository.dart';
import '../data/my_quizzes_repository.dart';

/// Student-authored practice tests — mobile mirror of web's `/my-quizzes`.
/// Free for any logged-in student, no subscription gate.
class MyQuizzesScreen extends ConsumerStatefulWidget {
  const MyQuizzesScreen({super.key});

  @override
  ConsumerState<MyQuizzesScreen> createState() => _MyQuizzesScreenState();
}

class _MyQuizzesScreenState extends ConsumerState<MyQuizzesScreen> {
  bool _creating = false;
  bool _saving = false;
  String? _error;
  final _titleController = TextEditingController();
  String? _topicId;

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final quiz = await ref.read(myQuizzesRepositoryProvider).create(title: title, customTopicId: _topicId);
      ref.invalidate(myQuizzesProvider);
      if (mounted) context.push('/my-quizzes/${quiz.id}');
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quizzes = ref.watch(myQuizzesProvider);
    final topics = ref.watch(customTopicsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Practice Tests'),
        actions: [
          IconButton(
            icon: Icon(_creating ? Icons.close : Icons.add),
            tooltip: _creating ? 'Cancel' : 'Create',
            onPressed: () => setState(() => _creating = !_creating),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_creating)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _titleController,
                    decoration: const InputDecoration(hintText: 'Quiz title', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 10),
                  topics.maybeWhen(
                    data: (list) => list.isEmpty
                        ? const SizedBox.shrink()
                        : DropdownButtonFormField<String?>(
                            initialValue: _topicId,
                            decoration: const InputDecoration(labelText: 'Link to topic (optional)', border: OutlineInputBorder()),
                            items: [
                              const DropdownMenuItem(value: null, child: Text('None')),
                              for (final t in list) DropdownMenuItem(value: t.id, child: Text(t.name, overflow: TextOverflow.ellipsis)),
                            ],
                            onChanged: (v) => setState(() => _topicId = v),
                          ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: _saving ? null : _create,
                    child: _saving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white))
                        : const Text('Create'),
                  ),
                ],
              ),
            ),
          const Divider(height: 1, color: AppColors.line),
          Expanded(
            child: quizzes.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(child: Text(apiErrorMessage(error))),
              data: (list) {
                if (list.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(
                        'No practice tests yet — create your first one.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final q = list[i];
                    return Card(
                      margin: EdgeInsets.zero,
                      child: ListTile(
                        title: Text(q.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('${q.questionCount} questions'),
                        trailing: q.bestScore != null
                            ? Text('${q.bestScore!.round()}% best', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.success))
                            : null,
                        onTap: () => context.push('/my-quizzes/${q.id}'),
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
