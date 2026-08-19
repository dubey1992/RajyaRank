import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'payment_models.dart';

final productsProvider = FutureProvider.autoDispose<List<ProductView>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/products');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(ProductView.fromJson)
      .toList();
});

final entitlementsProvider = FutureProvider.autoDispose<List<EntitlementView>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/entitlements');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(EntitlementView.fromJson)
      .toList();
});

final ordersProvider = FutureProvider.autoDispose<List<OrderSummary>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/orders');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(OrderSummary.fromJson)
      .toList();
});

final savedCardsProvider = FutureProvider.autoDispose<List<SavedPaymentMethod>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/payment-methods');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(SavedPaymentMethod.fromJson)
      .toList();
});

final coursePricingProvider = FutureProvider.autoDispose
    .family<CoursePricingResolved, String>((ref, courseId) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/courses/$courseId/pricing');
      return CoursePricingResolved.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    });

class PaymentRepository {
  PaymentRepository(this._ref);
  final Ref _ref;

  /// POST orders/coupons/preview — UX-only, doesn't reserve the coupon;
  /// `createOrder` re-validates and actually claims it.
  Future<PreviewCouponResult> previewCoupon({
    required String productId,
    required String couponCode,
  }) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/orders/coupons/preview',
      data: {'productId': productId, 'couponCode': couponCode},
    );
    return PreviewCouponResult.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  /// POST orders — check `alreadyPaid` before opening Razorpay Checkout: a
  /// free product or a coupon down to zero skips the payment step entirely.
  Future<CreateOrderResult> createOrder({
    required String productId,
    String? couponCode,
    String? accessCode,
  }) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/orders',
      data: {
        'productId': productId,
        if (couponCode != null) 'couponCode': couponCode,
        if (accessCode != null) 'accessCode': accessCode,
      },
    );
    return CreateOrderResult.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  /// POST payments/razorpay/verify — note: NOT razorpayOrderId, the server
  /// already knows the provider order id from `orderId`.
  Future<void> verifyPayment({
    required String orderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/payments/razorpay/verify',
      data: {
        'orderId': orderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );
  }

  Future<SetupPaymentMethodResult> setupCardIntent() async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post('/payment-methods/setup-intent');
    return SetupPaymentMethodResult.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  Future<void> confirmCard({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.post(
      '/payment-methods/confirm',
      data: {
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      },
    );
  }

  Future<void> setDefaultCard(String id) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.patch('/payment-methods/$id/default');
  }

  Future<void> deleteCard(String id) async {
    final api = _ref.read(apiClientProvider);
    await api.dio.delete('/payment-methods/$id');
  }

  /// GET student/orders/:id/receipt — a raw PDF stream, not the usual JSON
  /// envelope.
  Future<List<int>> downloadReceipt(String orderId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.get<List<int>>(
      '/student/orders/$orderId/receipt',
      options: Options(responseType: ResponseType.bytes),
    );
    return response.data ?? const [];
  }
}

final paymentRepositoryProvider = Provider((ref) => PaymentRepository(ref));
