import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/marketing_repository.dart';

/// "Common questions" — up to 5 real FAQ rows from GET /faqs, as collapsible
/// tiles (matching the website's own collapsed-by-default details element).
/// No "view all" — there's no dedicated FAQ screen in the app. Hides
/// entirely when the API returns nothing, same reasoning as testimonials.
class FaqSection extends ConsumerWidget {
  const FaqSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final faqs = ref.watch(faqsProvider);
    return faqs.maybeWhen(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        final top = items.take(5).toList();
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Common questions',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.line),
                ),
                child: Theme(
                  data: Theme.of(context)
                      .copyWith(dividerColor: Colors.transparent),
                  child: Column(
                    children: [
                      for (var i = 0; i < top.length; i++) ...[
                        if (i > 0)
                          const Divider(height: 1, color: AppColors.line),
                        ExpansionTile(
                          tilePadding: const EdgeInsets.symmetric(
                            horizontal: 14,
                          ),
                          childrenPadding: const EdgeInsets.fromLTRB(
                            14,
                            0,
                            14,
                            14,
                          ),
                          title: Text(
                            top[i].questionEn,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                          expandedAlignment: Alignment.centerLeft,
                          children: [
                            Text(
                              top[i].answerEn,
                              style: const TextStyle(
                                color: AppColors.muted,
                                fontSize: 12.5,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}
