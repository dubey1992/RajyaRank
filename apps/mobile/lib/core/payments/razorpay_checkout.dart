import 'dart:async';

import 'package:razorpay_flutter/razorpay_flutter.dart';

/// Wraps razorpay_flutter's event-callback API (on(EVENT, handler)) into a
/// single awaitable call — the plugin has no Future-based entry point of its
/// own. One instance is used per checkout attempt and torn down afterward.
class RazorpayCheckout {
  Razorpay? _razorpay;

  Future<PaymentSuccessResponse> open(Map<String, dynamic> options) {
    final completer = Completer<PaymentSuccessResponse>();
    final razorpay = Razorpay();
    _razorpay = razorpay;

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (
      PaymentSuccessResponse response,
    ) {
      if (!completer.isCompleted) completer.complete(response);
    });
    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse response) {
      if (!completer.isCompleted) {
        completer.completeError(
          RazorpayCheckoutException(_describeFailure(response)),
        );
      }
    });
    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse response) {
      if (!completer.isCompleted) {
        completer.completeError(
          RazorpayCheckoutException('Payment cancelled'),
        );
      }
    });

    razorpay.open(options);
    return completer.future.whenComplete(dispose);
  }

  void dispose() {
    _razorpay?.clear();
    _razorpay = null;
  }
}

/// razorpay_flutter's native bridge sometimes hands back the literal string
/// "undefined" (not null) as `message` — most reliably when the user cancels
/// by pressing back rather than triggering a real payment error — so a plain
/// `response.message ?? fallback` lets that literal string leak straight into
/// the UI. Checked case-insensitively and trimmed for the same reason.
String _describeFailure(PaymentFailureResponse response) {
  if (response.code == Razorpay.PAYMENT_CANCELLED) return 'Payment cancelled.';
  final message = response.message?.trim();
  if (message == null || message.isEmpty || message.toLowerCase() == 'undefined') {
    return 'Payment failed. Please try again.';
  }
  return message;
}

class RazorpayCheckoutException implements Exception {
  RazorpayCheckoutException(this.message);
  final String message;

  @override
  String toString() => message;
}
