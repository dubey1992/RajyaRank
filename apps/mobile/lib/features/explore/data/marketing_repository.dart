import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'marketing_models.dart';

/// GET /testimonials — public, unauthenticated (apps/api/src/marketing/
/// marketing.controller.ts `testimonials()`), the same real student-quote
/// data the website's homepage shows. Only published rows, already sorted.
final testimonialsProvider = FutureProvider.autoDispose<List<Testimonial>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/testimonials');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(Testimonial.fromJson)
      .toList();
});

/// GET /faqs — public, unauthenticated (marketing.controller.ts `faqs()`).
final faqsProvider = FutureProvider.autoDispose<List<Faq>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/faqs');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(Faq.fromJson)
      .toList();
});
