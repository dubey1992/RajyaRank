import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'current_affairs_models.dart';

final currentAffairsProvider =
    FutureProvider.autoDispose<List<CurrentAffairItem>>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/current-affairs');
      return (response.data['data'] as List)
          .cast<Map<String, dynamic>>()
          .map(CurrentAffairItem.fromJson)
          .toList();
    });

/// GET /current-affairs — public, unauthenticated feed (catalogue.controller.ts
/// `currentAffairs()`), for the pre-login Explore screen. Same response
/// shape as `/student/current-affairs` for the fields [CurrentAffairItem]
/// reads, so no separate model is needed — just a different, signed-out-safe
/// route.
final publicCurrentAffairsProvider =
    FutureProvider.autoDispose<List<CurrentAffairItem>>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/current-affairs');
      return (response.data['data'] as List)
          .cast<Map<String, dynamic>>()
          .map(CurrentAffairItem.fromJson)
          .toList();
    });
