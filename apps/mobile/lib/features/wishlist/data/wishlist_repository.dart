import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'wishlist_models.dart';

final wishlistCourseIdsProvider = FutureProvider.autoDispose<Set<String>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/wishlist/course-ids');
  return (response.data['data'] as List).cast<String>().toSet();
});

final wishlistCoursesProvider = FutureProvider.autoDispose<List<WishlistCourse>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/student/wishlist');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(WishlistCourse.fromJson)
      .toList();
});

class WishlistRepository {
  WishlistRepository(this._ref);
  final Ref _ref;

  /// POST student/courses/:id/wishlist — toggles, returns the new state.
  Future<bool> toggle(String courseId) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post('/student/courses/$courseId/wishlist');
    return response.data['data']['wishlisted'] as bool;
  }
}

final wishlistRepositoryProvider = Provider((ref) => WishlistRepository(ref));
