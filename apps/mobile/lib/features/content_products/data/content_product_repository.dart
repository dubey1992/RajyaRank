import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'content_product_models.dart';

/// GET content-products (apps/api/src/content-products — @Public(), no auth
/// needed) — every active, publicly-priced lesson, test, and pack. The real
/// replacement for the old fake StudyContentTeaser-backed "coming soon" grid.
final contentProductsProvider =
    FutureProvider.autoDispose<List<ContentProduct>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/content-products');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(ContentProduct.fromJson)
      .toList();
});
