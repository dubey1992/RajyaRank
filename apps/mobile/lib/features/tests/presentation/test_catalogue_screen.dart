import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/test_models.dart';
import '../data/test_repository.dart';
import 'test_runner_screen.dart';

class TestCatalogueScreen extends ConsumerStatefulWidget {
  const TestCatalogueScreen({super.key});

  @override
  ConsumerState<TestCatalogueScreen> createState() =>
      _TestCatalogueScreenState();
}

class _TestCatalogueScreenState extends ConsumerState<TestCatalogueScreen> {
  String? _startingId;

  Future<void> _start(StudentTestListItem test) async {
    setState(() => _startingId = test.testVersionId);
    try {
      final attempt = await ref
          .read(testRepositoryProvider)
          .startAttempt(test.testVersionId);
      if (!mounted) return;
      context.push(
        '/tests/runner',
        extra: RunnerArgs(titleEn: test.titleEn, attempt: attempt),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _startingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tests = ref.watch(testsCatalogueProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Tests')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(testsCatalogueProvider),
        child: tests.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
            ),
          ),
          data: (list) => list.isEmpty
              ? const Center(
                  child: Text(
                    'No tests available yet.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) => _TestCard(
                    test: list[i],
                    starting: _startingId == list[i].testVersionId,
                    onStart: () => _start(list[i]),
                  ),
                ),
        ),
      ),
    );
  }
}

class _TestCard extends StatelessWidget {
  const _TestCard({
    required this.test,
    required this.starting,
    required this.onStart,
  });

  final StudentTestListItem test;
  final bool starting;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final completed = test.completedAttemptId != null;
    final locked = !test.accessible && !completed;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(test.titleEn, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(
              '${test.questionCount} questions · ${test.durationMinutes} min',
              style: const TextStyle(color: AppColors.muted, fontSize: 13),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: locked
                  ? OutlinedButton(
                      onPressed: null,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.lock_outline, size: 16),
                          SizedBox(width: 6),
                          Text('Locked'),
                        ],
                      ),
                    )
                  : completed
                  ? OutlinedButton(
                      onPressed: () => context.push(
                        '/tests/review/${test.completedAttemptId}',
                      ),
                      child: const Text('View result'),
                    )
                  : ElevatedButton(
                      onPressed: starting ? null : onStart,
                      child: starting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Start test'),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
