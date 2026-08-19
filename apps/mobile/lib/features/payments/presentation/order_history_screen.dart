import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/payment_models.dart';
import '../data/payment_repository.dart';

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  String? _downloadingId;

  Future<void> _downloadReceipt(OrderSummary order) async {
    setState(() => _downloadingId = order.id);
    try {
      final bytes = await ref
          .read(paymentRepositoryProvider)
          .downloadReceipt(order.id);
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/receipt-${order.id.substring(0, 8)}.pdf');
      await file.writeAsBytes(bytes);
      await OpenFilex.open(file.path);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _downloadingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orders = ref.watch(ordersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Order History')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(ordersProvider),
        child: orders.when(
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
                    'No orders yet.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final order = list[i];
                    final paid = order.status == 'PAID';
                    final downloading = _downloadingId == order.id;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text(order.product),
                        subtitle: Text(
                          '${_statusLabel(order.status)} · '
                          '${_formatDate(order.createdAt)}',
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '₹${(order.amountMinor / 100).toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            if (paid)
                              downloading
                                  ? const Padding(
                                      padding: EdgeInsets.only(top: 4),
                                      child: SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    )
                                  : TextButton(
                                      onPressed: () => _downloadReceipt(order),
                                      style: TextButton.styleFrom(
                                        padding: EdgeInsets.zero,
                                        minimumSize: const Size(0, 0),
                                      ),
                                      child: const Text(
                                        'Receipt',
                                        style: TextStyle(fontSize: 12),
                                      ),
                                    ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }

  String _statusLabel(String status) => switch (status) {
    'PAID' => 'Paid',
    'PENDING' => 'Pending',
    'CREATED' => 'Created',
    'REFUNDED_FULL' => 'Refunded',
    'REFUNDED_PARTIAL' => 'Partially refunded',
    _ => status,
  };

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}
