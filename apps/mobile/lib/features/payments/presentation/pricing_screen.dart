import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/payment_models.dart';
import '../data/payment_repository.dart';
import 'checkout_sheet.dart';

class PricingScreen extends ConsumerWidget {
  const PricingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);
    final entitlements = ref.watch(entitlementsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Plans & Courses')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(productsProvider);
          ref.invalidate(entitlementsProvider);
        },
        child: products.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
            ),
          ),
          data: (all) {
            final plans = all.where((p) => p.isSubscription).toList();
            final courses = all.where((p) => !p.isSubscription).toList();
            final ownedTitles = entitlements.maybeWhen(
              data: (list) => list
                  .where((e) => e.isLive)
                  .map((e) => e.productTitleEn)
                  .toSet(),
              orElse: () => <String>{},
            );
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (plans.isNotEmpty) ...[
                  Text('Plans', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final p in plans)
                    _ProductCard(
                      product: p,
                      owned: ownedTitles.contains(p.titleEn),
                    ),
                  const SizedBox(height: 20),
                ],
                if (courses.isNotEmpty) ...[
                  Text('Courses', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final p in courses)
                    _ProductCard(
                      product: p,
                      owned: ownedTitles.contains(p.titleEn),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.owned});

  final ProductView product;
  final bool owned;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(product.titleEn, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  product.isFree
                      ? 'Free'
                      : '₹${product.priceRupees.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppColors.navy900,
                  ),
                ),
                if (product.originalPriceRupees != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    '₹${product.originalPriceRupees!.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: AppColors.muted,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ],
                if (product.validityDays != null) ...[
                  const Spacer(),
                  Text(
                    '${product.validityDays} days',
                    style: const TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: owned
                  ? OutlinedButton(
                      onPressed: null,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.check_circle, size: 16),
                          SizedBox(width: 6),
                          Text('Owned'),
                        ],
                      ),
                    )
                  : ElevatedButton(
                      onPressed: () => showCheckoutSheet(context, product),
                      child: Text(product.isFree ? 'Get for free' : 'Buy now'),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
