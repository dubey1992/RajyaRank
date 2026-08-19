import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/test_models.dart';
import '../data/test_repository.dart';

class TestReviewScreen extends ConsumerWidget {
  const TestReviewScreen({super.key, required this.attemptId});

  final String attemptId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final result = ref.watch(attemptResultProvider(attemptId));

    return Scaffold(
      appBar: AppBar(title: const Text('Review')),
      body: result.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
          ),
        ),
        data: (data) {
          if (!data.released || data.questions == null) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Detailed review for this test is not available yet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.muted),
                ),
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: data.questions!.length,
            itemBuilder: (context, i) =>
                _ReviewQuestionCard(question: data.questions![i], index: i),
          );
        },
      ),
    );
  }
}

class _ReviewQuestionCard extends StatelessWidget {
  const _ReviewQuestionCard({required this.question, required this.index});

  final ResultQuestion question;
  final int index;

  @override
  Widget build(BuildContext context) {
    final responseKeys = ResultQuestion.asKeySet(question.response);
    final correctKeys = ResultQuestion.asKeySet(question.correctAnswer);
    final unanswered = responseKeys.isEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Q${index + 1}. ${question.textEn}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                _VerdictPill(isCorrect: question.isCorrect, unanswered: unanswered),
              ],
            ),
            const SizedBox(height: 12),
            if (question.type == QuestionType.match)
              const Text(
                "This question type's review isn't supported in the app "
                'yet — check the web app for full details.',
                style: TextStyle(color: AppColors.muted),
              )
            else
              for (final option in question.options)
                _ReviewOptionRow(
                  label: option.en,
                  isCorrect: correctKeys.contains(option.key),
                  isSelected: responseKeys.contains(option.key),
                ),
            if (question.awarded != null) ...[
              const SizedBox(height: 6),
              Text(
                'Marks: ${question.awarded! >= 0 ? '+' : ''}${question.awarded!.toStringAsFixed(2)}',
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
            if (question.explanationEn != null &&
                question.explanationEn!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  question.explanationEn!,
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReviewOptionRow extends StatelessWidget {
  const _ReviewOptionRow({
    required this.label,
    required this.isCorrect,
    required this.isSelected,
  });

  final String label;
  final bool isCorrect;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    Color background = Colors.white;
    Color border = AppColors.line;
    IconData? icon;
    Color? iconColor;

    if (isCorrect) {
      background = AppColors.success.withValues(alpha: 0.08);
      border = AppColors.success;
      icon = Icons.check_circle;
      iconColor = AppColors.success;
    } else if (isSelected) {
      background = AppColors.danger.withValues(alpha: 0.08);
      border = AppColors.danger;
      icon = Icons.cancel;
      iconColor = AppColors.danger;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 18, color: iconColor),
              const SizedBox(width: 8),
            ],
            Expanded(child: Text(label)),
          ],
        ),
      ),
    );
  }
}

class _VerdictPill extends StatelessWidget {
  const _VerdictPill({required this.isCorrect, required this.unanswered});

  final bool? isCorrect;
  final bool unanswered;

  @override
  Widget build(BuildContext context) {
    final (label, color) = unanswered
        ? ('Unanswered', AppColors.muted)
        : (isCorrect == true)
        ? ('Correct', AppColors.success)
        : ('Incorrect', AppColors.danger);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}
