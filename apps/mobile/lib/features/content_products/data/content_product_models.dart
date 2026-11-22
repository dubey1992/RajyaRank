/// Hand-ported from packages/contracts/src/content-products.ts's
/// ContentProductView — a lesson, a standalone test, or a curated pack of
/// several, each sellable on its own (see apps/api/src/content-products).
class ContentProductItem {
  ContentProductItem({
    required this.kind,
    required this.id,
    required this.titleEn,
  });

  factory ContentProductItem.fromJson(Map<String, dynamic> json) {
    return ContentProductItem(
      kind: json['kind'] as String? ?? '',
      id: json['id'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
    );
  }

  final String kind;
  final String id;
  final String titleEn;
}

class ContentProduct {
  ContentProduct({
    required this.id,
    required this.kind,
    required this.titleEn,
    required this.priceMinor,
    required this.originalPriceMinor,
    required this.currency,
    required this.items,
  });

  factory ContentProduct.fromJson(Map<String, dynamic> json) {
    final itemsJson = json['items'] as List<dynamic>?;
    return ContentProduct(
      id: json['id'] as String,
      kind: json['kind'] as String? ?? '',
      titleEn: json['titleEn'] as String? ?? '',
      priceMinor: (json['priceMinor'] as num?)?.toInt() ?? 0,
      originalPriceMinor: (json['originalPriceMinor'] as num?)?.toInt(),
      currency: json['currency'] as String? ?? 'INR',
      items: itemsJson == null
          ? const []
          : itemsJson
              .cast<Map<String, dynamic>>()
              .map(ContentProductItem.fromJson)
              .toList(),
    );
  }

  final String id;
  final String kind;
  final String titleEn;
  final int priceMinor;
  final int? originalPriceMinor;
  final String currency;
  // Non-empty only for a BUNDLE — the lessons/tests it includes.
  final List<ContentProductItem> items;

  bool get isBundle => kind == 'BUNDLE';
  double get priceRupees => priceMinor / 100;
  double? get originalPriceRupees =>
      originalPriceMinor == null ? null : originalPriceMinor! / 100;
}
