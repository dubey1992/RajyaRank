import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/doubt_models.dart';
import '../data/doubt_repository.dart';

const _statusTone = {
  'OPEN': AppColors.orange500,
  'ASSIGNED': AppColors.orange500,
  'ANSWERED': AppColors.teal500,
  'RESOLVED': AppColors.success,
  'REOPENED': AppColors.danger,
  'CLOSED': AppColors.muted,
};

class DoubtsScreen extends ConsumerStatefulWidget {
  const DoubtsScreen({super.key});

  @override
  ConsumerState<DoubtsScreen> createState() => _DoubtsScreenState();
}

class _DoubtsScreenState extends ConsumerState<DoubtsScreen> {
  Future<void> _askDoubt() async {
    final controller = TextEditingController();
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Ask a doubt', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: 5,
              minLines: 3,
              decoration: const InputDecoration(
                hintText: 'Describe what you need help with…',
              ),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
    if (submitted != true) return;
    final text = controller.text.trim();
    if (text.length < 3) return;
    try {
      await ref.read(doubtRepositoryProvider).ask(text);
      ref.invalidate(doubtsProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Doubt submitted')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final doubts = ref.watch(doubtsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Doubts')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _askDoubt,
        icon: const Icon(Icons.add),
        label: const Text('Ask'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(doubtsProvider),
        child: doubts.when(
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
                    "You haven't asked any doubts yet.",
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                  itemCount: list.length,
                  itemBuilder: (context, i) => _DoubtCard(doubt: list[i]),
                ),
        ),
      ),
    );
  }
}

class _DoubtCard extends StatelessWidget {
  const _DoubtCard({required this.doubt});
  final DoubtView doubt;

  @override
  Widget build(BuildContext context) {
    final color = _statusTone[doubt.status] ?? AppColors.muted;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    doubt.bodyText,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    doubt.status,
                    style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            if (doubt.replies.isNotEmpty) ...[
              const SizedBox(height: 10),
              const Divider(height: 1, color: AppColors.line),
              const SizedBox(height: 10),
              for (final reply in doubt.replies)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSoft,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(reply.bodyText, style: const TextStyle(fontSize: 13)),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
