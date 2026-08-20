import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/payments/razorpay_checkout.dart';
import '../../../core/theme/app_theme.dart';
import '../../dashboard/data/dashboard_repository.dart';
import '../data/payment_models.dart';
import '../data/payment_repository.dart';

/// Shared purchase flow for both courses and subscription plans — a Product
/// is a Product either way (see PaymentRepository.createOrder doc comment).
/// [accessCode] carries an institute-price redemption code through to
/// `createOrder` when the caller already verified one (see
/// `catalogue.controller.ts`'s `verify-institute-code` doc comment: the
/// preview is UX-only, purchase always re-validates the code server-side).
Future<bool?> showCheckoutSheet(
  BuildContext context,
  ProductView product, {
  String? accessCode,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => _CheckoutSheet(product: product, accessCode: accessCode),
  );
}

class _CheckoutSheet extends ConsumerStatefulWidget {
  const _CheckoutSheet({required this.product, this.accessCode});
  final ProductView product;
  final String? accessCode;

  @override
  ConsumerState<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends ConsumerState<_CheckoutSheet> {
  final _couponController = TextEditingController();
  PreviewCouponResult? _coupon;
  bool _applyingCoupon = false;
  bool _purchasing = false;
  String? _error;

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  int get _finalPriceMinor => _coupon?.finalPriceMinor ?? widget.product.priceMinor;

  Future<void> _applyCoupon() async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _applyingCoupon = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(paymentRepositoryProvider)
          .previewCoupon(productId: widget.product.id, couponCode: code);
      setState(() => _coupon = result);
    } catch (error) {
      setState(() {
        _coupon = null;
        _error = apiErrorMessage(error);
      });
    } finally {
      if (mounted) setState(() => _applyingCoupon = false);
    }
  }

  Future<void> _purchase() async {
    setState(() {
      _purchasing = true;
      _error = null;
    });
    final repo = ref.read(paymentRepositoryProvider);
    try {
      final order = await repo.createOrder(
        productId: widget.product.id,
        couponCode: _coupon != null ? _couponController.text.trim() : null,
        accessCode: widget.accessCode,
      );

      if (!order.alreadyPaid) {
        final checkout = RazorpayCheckout();
        final result = await checkout.open({
          'key': order.razorpayKeyId,
          'amount': order.amountMinor,
          'order_id': order.providerOrderId,
          'currency': order.currency,
          'name': 'RajyaRank',
          'description': order.productTitle,
          if (order.razorpayCustomerId != null)
            'customer_id': order.razorpayCustomerId,
        });
        await repo.verifyPayment(
          orderId: order.orderId,
          razorpayPaymentId: result.paymentId ?? '',
          razorpaySignature: result.signature ?? '',
        );
      }

      ref.invalidate(entitlementsProvider);
      ref.invalidate(ordersProvider);
      ref.invalidate(dashboardProvider);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      if (mounted) {
        if (apiErrorCode(error) == 'SUBSCRIPTION_REQUIRED') {
          await _promptSubscriptionRequired();
        } else {
          setState(
            () => _error = error is RazorpayCheckoutException
                ? error.message
                : apiErrorMessage(error),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _purchasing = false);
    }
  }

  /// This free course is a subscriber perk (see `payments.service.ts`'s
  /// SUBSCRIPTION_REQUIRED check) — instead of surfacing the raw server error
  /// inline, offer to take the student straight to the plans screen.
  Future<void> _promptSubscriptionRequired() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('A subscription plan is needed'),
        content: const Text(
          'This free course is only available to students with an active '
          'subscription plan. Do you want to continue to purchase a plan?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('View plans'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      Navigator.of(context).pop();
      context.push('/pricing');
    }
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    return Padding(
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
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.line,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(product.titleEn, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 14),
          Row(
            children: [
              Text(
                _coupon != null
                    ? '₹${(_coupon!.finalPriceMinor / 100).toStringAsFixed(0)}'
                    : (product.isFree
                          ? 'Free'
                          : '₹${product.priceRupees.toStringAsFixed(0)}'),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
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
            ],
          ),
          if (_coupon != null && _coupon!.discountMinor > 0) ...[
            const SizedBox(height: 4),
            Text(
              'Coupon applied — you saved ₹${(_coupon!.discountMinor / 100).toStringAsFixed(0)}',
              style: const TextStyle(color: AppColors.success, fontSize: 12),
            ),
          ],
          if (!product.isSubscription) ...[
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _couponController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(labelText: 'Coupon code'),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: _applyingCoupon ? null : _applyCoupon,
                  child: _applyingCoupon
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Apply'),
                ),
              ],
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.danger.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
            ),
          ],
          const SizedBox(height: 18),
          ElevatedButton(
            onPressed: _purchasing ? null : _purchase,
            child: _purchasing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    _finalPriceMinor == 0
                        ? 'Get for free'
                        : 'Pay ₹${(_finalPriceMinor / 100).toStringAsFixed(0)}',
                  ),
          ),
        ],
      ),
    );
  }
}
