import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/payments/razorpay_checkout.dart';
import '../../../core/theme/app_theme.dart';
import '../data/payment_models.dart';
import '../data/payment_repository.dart';

class SavedCardsScreen extends ConsumerStatefulWidget {
  const SavedCardsScreen({super.key});

  @override
  ConsumerState<SavedCardsScreen> createState() => _SavedCardsScreenState();
}

class _SavedCardsScreenState extends ConsumerState<SavedCardsScreen> {
  bool _adding = false;
  String? _busyCardId;

  Future<void> _addCard() async {
    setState(() => _adding = true);
    final repo = ref.read(paymentRepositoryProvider);
    try {
      final setup = await repo.setupCardIntent();
      final checkout = RazorpayCheckout();
      final result = await checkout.open({
        'key': setup.razorpayKeyId,
        'amount': setup.amountMinor,
        'order_id': setup.providerOrderId,
        'currency': setup.currency,
        'name': 'RajyaRank',
        'description': 'Save card for future payments',
        'customer_id': setup.razorpayCustomerId,
        'save': 1,
      });
      await repo.confirmCard(
        razorpayOrderId: result.orderId ?? setup.providerOrderId,
        razorpayPaymentId: result.paymentId ?? '',
        razorpaySignature: result.signature ?? '',
      );
      ref.invalidate(savedCardsProvider);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Card saved')));
      }
    } catch (error) {
      if (mounted) {
        final message = error is RazorpayCheckoutException
            ? error.message
            : apiErrorMessage(error);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  Future<void> _setDefault(SavedPaymentMethod card) async {
    setState(() => _busyCardId = card.id);
    try {
      await ref.read(paymentRepositoryProvider).setDefaultCard(card.id);
      ref.invalidate(savedCardsProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busyCardId = null);
    }
  }

  Future<void> _delete(SavedPaymentMethod card) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove card'),
        content: Text('Remove the card ending in ${card.cardLast4}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busyCardId = card.id);
    try {
      await ref.read(paymentRepositoryProvider).deleteCard(card.id);
      ref.invalidate(savedCardsProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busyCardId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cards = ref.watch(savedCardsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Saved Cards')),
      body: Column(
        children: [
          Expanded(
            child: cards.when(
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
                        'No saved cards yet.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: list.length,
                      itemBuilder: (context, i) {
                        final card = list[i];
                        final busy = _busyCardId == card.id;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: const Icon(
                              Icons.credit_card,
                              color: AppColors.navy800,
                            ),
                            title: Text(
                              '${card.cardNetwork} •••• ${card.cardLast4}',
                            ),
                            subtitle: Text(
                              'Expires ${card.expiryMonth.toString().padLeft(2, '0')}/${card.expiryYear}'
                              '${card.isDefault ? ' · Default' : ''}',
                            ),
                            trailing: busy
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : PopupMenuButton<String>(
                                    onSelected: (value) => value == 'default'
                                        ? _setDefault(card)
                                        : _delete(card),
                                    itemBuilder: (context) => [
                                      if (!card.isDefault)
                                        const PopupMenuItem(
                                          value: 'default',
                                          child: Text('Set as default'),
                                        ),
                                      const PopupMenuItem(
                                        value: 'delete',
                                        child: Text('Remove'),
                                      ),
                                    ],
                                  ),
                          ),
                        );
                      },
                    ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: ElevatedButton(
              onPressed: _adding ? null : _addCard,
              child: _adding
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Add a card'),
            ),
          ),
        ],
      ),
    );
  }
}
