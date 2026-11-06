import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_card.dart';
import '../../data/marketing_models.dart';
import '../../data/marketing_repository.dart';

/// "What students say" — real quotes from GET /testimonials, the same data
/// the website's homepage shows. Unlike the Popular-courses/Current-affairs
/// sections, this hides entirely (no header either) when there's nothing to
/// show — "no reviews yet" isn't actionable for a student the way "no
/// courses yet" is, so there's no empty-state placeholder here.
class TestimonialsSection extends ConsumerWidget {
  const TestimonialsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final testimonials = ref.watch(testimonialsProvider);
    return testimonials.maybeWhen(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
              child: Text(
                'What students say',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
            SizedBox(
              height: 168,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: items.length,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => _TestimonialCard(item: items[i]),
              ),
            ),
          ],
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}

class _TestimonialCard extends StatelessWidget {
  const _TestimonialCard({required this.item});

  final Testimonial item;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 260,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: List.generate(
                5,
                (_) => const Icon(
                  Icons.star_rounded,
                  size: 14,
                  color: AppColors.orange500,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: Text(
                '"${item.quoteEn}"',
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12.5,
                  height: 1.4,
                  color: AppColors.ink,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: AppColors.navy100,
                  child: Text(
                    item.initials,
                    style: const TextStyle(
                      color: AppColors.navy900,
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.studentName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        '${item.examLabel} aspirant',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10.5,
                          color: AppColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
