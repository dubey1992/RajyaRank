/// Hand-ported from packages/contracts/src/payment.ts.
class ProductView {
  ProductView({
    required this.id,
    required this.kind,
    required this.courseId,
    required this.titleEn,
    required this.priceMinor,
    required this.originalPriceMinor,
    required this.currency,
    required this.validityDays,
    required this.accessType,
    required this.audience,
  });

  factory ProductView.fromJson(Map<String, dynamic> json) {
    return ProductView(
      id: json['id'] as String,
      kind: json['kind'] as String? ?? '',
      courseId: json['courseId'] as String?,
      titleEn: json['titleEn'] as String? ?? '',
      priceMinor: (json['priceMinor'] as num?)?.toInt() ?? 0,
      originalPriceMinor: (json['originalPriceMinor'] as num?)?.toInt(),
      currency: json['currency'] as String? ?? 'INR',
      validityDays: (json['validityDays'] as num?)?.toInt(),
      accessType: json['accessType'] as String? ?? '',
      audience: json['audience'] as String? ?? 'PUBLIC',
    );
  }

  final String id;
  final String kind;
  final String? courseId;
  final String titleEn;
  final int priceMinor;
  final int? originalPriceMinor;
  final String currency;
  final int? validityDays;
  final String accessType;
  final String audience;

  bool get isSubscription => kind == 'SUBSCRIPTION';
  bool get isFree => priceMinor == 0;
  bool get isInstitute => audience == 'INSTITUTE';
  double get priceRupees => priceMinor / 100;
  double? get originalPriceRupees =>
      originalPriceMinor == null ? null : originalPriceMinor! / 100;
}

class CoursePricingView {
  CoursePricingView({
    required this.id,
    required this.priceMinor,
    required this.originalPriceMinor,
    required this.currency,
  });

  factory CoursePricingView.fromJson(Map<String, dynamic> json) {
    return CoursePricingView(
      id: json['id'] as String,
      priceMinor: (json['priceMinor'] as num?)?.toInt() ?? 0,
      originalPriceMinor: (json['originalPriceMinor'] as num?)?.toInt(),
      currency: json['currency'] as String? ?? 'INR',
    );
  }

  final String id;
  final int priceMinor;
  final int? originalPriceMinor;
  final String currency;
}

class CoursePricingResolved {
  CoursePricingResolved({
    required this.public,
    required this.institute,
    required this.qualifiesForInstitute,
  });

  factory CoursePricingResolved.fromJson(Map<String, dynamic> json) {
    final publicJson = json['public'] as Map<String, dynamic>?;
    final instituteJson = json['institute'] as Map<String, dynamic>?;
    return CoursePricingResolved(
      public: publicJson == null ? null : CoursePricingView.fromJson(publicJson),
      institute:
          instituteJson == null ? null : CoursePricingView.fromJson(instituteJson),
      qualifiesForInstitute: json['qualifiesForInstitute'] as bool? ?? false,
    );
  }

  final CoursePricingView? public;
  final CoursePricingView? institute;
  final bool qualifiesForInstitute;
}

class PreviewCouponResult {
  PreviewCouponResult({
    required this.originalPriceMinor,
    required this.discountMinor,
    required this.finalPriceMinor,
  });

  factory PreviewCouponResult.fromJson(Map<String, dynamic> json) {
    return PreviewCouponResult(
      originalPriceMinor: (json['originalPriceMinor'] as num?)?.toInt() ?? 0,
      discountMinor: (json['discountMinor'] as num?)?.toInt() ?? 0,
      finalPriceMinor: (json['finalPriceMinor'] as num?)?.toInt() ?? 0,
    );
  }

  final int originalPriceMinor;
  final int discountMinor;
  final int finalPriceMinor;
}

class CreateOrderResult {
  CreateOrderResult({
    required this.orderId,
    required this.providerOrderId,
    required this.amountMinor,
    required this.currency,
    required this.razorpayKeyId,
    required this.productTitle,
    required this.razorpayCustomerId,
    required this.alreadyPaid,
  });

  factory CreateOrderResult.fromJson(Map<String, dynamic> json) {
    return CreateOrderResult(
      orderId: json['orderId'] as String,
      providerOrderId: json['providerOrderId'] as String?,
      amountMinor: (json['amountMinor'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
      razorpayKeyId: json['razorpayKeyId'] as String? ?? '',
      productTitle: json['productTitle'] as String? ?? '',
      razorpayCustomerId: json['razorpayCustomerId'] as String?,
      alreadyPaid: json['alreadyPaid'] as bool? ?? false,
    );
  }

  final String orderId;
  final String? providerOrderId;
  final int amountMinor;
  final String currency;
  final String razorpayKeyId;
  final String productTitle;
  final String? razorpayCustomerId;
  final bool alreadyPaid;
}

class SavedPaymentMethod {
  SavedPaymentMethod({
    required this.id,
    required this.cardLast4,
    required this.cardNetwork,
    required this.expiryMonth,
    required this.expiryYear,
    required this.isDefault,
  });

  factory SavedPaymentMethod.fromJson(Map<String, dynamic> json) {
    return SavedPaymentMethod(
      id: json['id'] as String,
      cardLast4: json['cardLast4'] as String? ?? '',
      cardNetwork: json['cardNetwork'] as String? ?? '',
      expiryMonth: (json['expiryMonth'] as num?)?.toInt() ?? 0,
      expiryYear: (json['expiryYear'] as num?)?.toInt() ?? 0,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  final String id;
  final String cardLast4;
  final String cardNetwork;
  final int expiryMonth;
  final int expiryYear;
  final bool isDefault;
}

class SetupPaymentMethodResult {
  SetupPaymentMethodResult({
    required this.razorpayKeyId,
    required this.razorpayCustomerId,
    required this.providerOrderId,
    required this.amountMinor,
    required this.currency,
  });

  factory SetupPaymentMethodResult.fromJson(Map<String, dynamic> json) {
    return SetupPaymentMethodResult(
      razorpayKeyId: json['razorpayKeyId'] as String? ?? '',
      razorpayCustomerId: json['razorpayCustomerId'] as String? ?? '',
      providerOrderId: json['providerOrderId'] as String? ?? '',
      amountMinor: (json['amountMinor'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'INR',
    );
  }

  final String razorpayKeyId;
  final String razorpayCustomerId;
  final String providerOrderId;
  final int amountMinor;
  final String currency;
}

class OrderSummary {
  OrderSummary({
    required this.id,
    required this.status,
    required this.amountMinor,
    required this.product,
    required this.createdAt,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id'] as String,
      status: json['status'] as String? ?? '',
      amountMinor: (json['amountMinor'] as num?)?.toInt() ?? 0,
      product: json['product'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  final String id;
  final String status;
  final int amountMinor;
  final String product;
  final DateTime createdAt;
}

class EntitlementView {
  EntitlementView({
    required this.id,
    required this.productTitleEn,
    required this.status,
    required this.accessType,
    required this.endsAt,
  });

  factory EntitlementView.fromJson(Map<String, dynamic> json) {
    final endsAtRaw = json['endsAt'] as String?;
    return EntitlementView(
      id: json['id'] as String,
      productTitleEn: json['productTitleEn'] as String? ?? '',
      status: json['status'] as String? ?? '',
      accessType: json['accessType'] as String? ?? '',
      endsAt: endsAtRaw == null ? null : DateTime.tryParse(endsAtRaw),
    );
  }

  final String id;
  final String productTitleEn;
  final String status;
  final String accessType;
  final DateTime? endsAt;

  bool get isLive =>
      status == 'ACTIVE' && (endsAt == null || endsAt!.isAfter(DateTime.now()));
}
