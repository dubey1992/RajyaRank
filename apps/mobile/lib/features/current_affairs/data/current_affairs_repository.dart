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
