import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/pill_badge.dart';
import '../../data/marketing_content.dart';

/// "Find the right exam for your goal" — ported from the website's own
/// static exam-coverage cards. Informational only, same as web: these
/// categories aren't backed by real courses/pricing yet, so there's
/// deliberately no tap-through/"Buy" action here.
class ExamCoverageSection extends StatelessWidget {
  const ExamCoverageSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Find the right exam for your goal',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              const Text(
                'Popular government exams from All Over India. More categories are added as the platform grows.',
                style: TextStyle(
                  color: AppColors.muted,
                  fontSize: 12.5,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 236,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: examCards.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) => _ExamCardTile(card: examCards[i]),
          ),
        ),
      ],
    );
  }
}

class _ExamCardTile extends StatelessWidget {
  const _ExamCardTile({required this.card});

  final ExamCard card;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 224,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(card.emoji, style: const TextStyle(fontSize: 20)),
                const Spacer(),
                PillBadge(
                  label: card.tag == ExamCardTag.popular ? 'Popular' : 'New',
                  tone: card.tag == ExamCardTag.popular
                      ? PillTone.orange
                      : PillTone.teal,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Flexible(
                  child: Text(
                    card.title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ),
                if (card.official) ...[
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.verified,
                    size: 14,
                    color: AppColors.teal500,
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Expanded(
              child: Text(
                card.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: AppColors.muted,
                  fontSize: 11.5,
                  height: 1.3,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 5,
              runSpacing: 5,
              children: [
                for (final m in card.meta)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSoft,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      m,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.muted,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  card.price,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: AppColors.navy900,
                  ),
                ),
                Text(
                  card.validity,
                  style: const TextStyle(fontSize: 10, color: AppColors.muted),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
