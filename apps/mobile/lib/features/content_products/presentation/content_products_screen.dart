import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/pill_badge.dart';
import '../../../core/auth/auth_repository.dart' show authControllerProvider, AuthStatus;
import '../../payments/data/payment_models.dart';
import '../../payments/presentation/checkout_sheet.dart';
import '../data/content_product_models.dart';
import '../data/content_product_repository.dart';

/// Mirrors web's /content browse page — every individually-purchasable
/// lesson, test, and pack in one place, with a real Buy button on each.
class ContentProductsScreen extends ConsumerWidget {
  const ContentProductsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(contentProductsProvider);
    final signedIn =
        ref.watch(authControllerProvider).status == AuthStatus.signedIn;
    return Scaffold(
      appBar: AppBar(title: const Text('Individual Content')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(contentProductsProvider),
        child: products.when(
          data: (items) => items.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      icon: Icons.shopping_bag_outlined,
                      title: 'No individual content yet',
                      message:
                          'Check back later — institutes are still adding lessons, tests, and packs you can buy on their own.',
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, i) =>
                      _ContentProductCard(item: items[i], signedIn: signedIn),
                ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Text(
              'Could not load individual content.',
              style: TextStyle(color: AppColors.muted),
            ),
          ),
        ),
      ),
    );
  }
}

class _ContentProductCard extends StatelessWidget {
  const _ContentProductCard({required this.item, required this.signedIn});

  final ContentProduct item;
  final bool signedIn;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                PillBadge(label: item.kind, tone: PillTone.navy),
                const SizedBox(height: 6),
                Text(
                  item.titleEn,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
                if (item.isBundle && item.items.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.items.map((i) => i.titleEn).join(', '),
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      '₹${item.priceRupees.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        color: AppColors.navy900,
                      ),
                    ),
                    if (item.originalPriceRupees != null) ...[
                      const SizedBox(width: 6),
                      Text(
                        '₹${item.originalPriceRupees!.toStringAsFixed(0)}',
                        style: TextStyle(
                          color: AppColors.muted,
                          decoration: TextDecoration.lineThrough,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: () {
              if (!signedIn) {
                context.go('/login');
                return;
              }
              showCheckoutSheet(
                context,
                ProductView(
                  id: item.id,
                  kind: item.kind,
                  courseId: null,
                  titleEn: item.titleEn,
                  priceMinor: item.priceMinor,
                  originalPriceMinor: item.originalPriceMinor,
                  currency: item.currency,
                  validityDays: null,
                  accessType: 'PAID',
                  audience: 'PUBLIC',
                ),
              );
            },
            child: const Text('Buy'),
          ),
        ],
      ),
    );
  }
}
