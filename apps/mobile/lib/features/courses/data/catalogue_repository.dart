import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../payments/data/payment_models.dart';
import 'catalogue_models.dart';

/// GET /courses — public, unauthenticated catalogue (apps/api/src/catalogue/
/// catalogue.controller.ts `courses()`). Reachable without a Bearer token,
/// same as web's `/courses` page.
final publicCoursesProvider = FutureProvider.autoDispose<List<PublicCourse>>((
  ref,
) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/courses');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(PublicCourse.fromJson)
      .toList();
});

final examsProvider = FutureProvider.autoDispose<List<ExamRef>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/exams');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(ExamRef.fromJson)
      .toList();
});

final statesProvider = FutureProvider.autoDispose<List<StateRef>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/states');
  return (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(StateRef.fromJson)
      .toList();
});

/// GET /courses/:id/outline — public pre-purchase syllabus.
final courseOutlineProvider = FutureProvider.autoDispose
    .family<CourseOutline?, String>((ref, courseId) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/courses/$courseId/outline');
      final data = response.data['data'];
      return data == null
          ? null
          : CourseOutline.fromJson(data as Map<String, dynamic>);
    });

/// GET /courses/:id/ratings — public.
final courseRatingsProvider = FutureProvider.autoDispose
    .family<CourseRatings, String>((ref, courseId) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/courses/$courseId/ratings');
      return CourseRatings.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    });

class CatalogueRepository {
  CatalogueRepository(this._ref);
  final Ref _ref;

  /// POST courses/:id/verify-institute-code — public, throttled 8/min.
  Future<VerifyInstituteCodeResult> verifyInstituteCode({
    required String courseId,
    required String code,
  }) async {
    final api = _ref.read(apiClientProvider);
    final response = await api.dio.post(
      '/courses/$courseId/verify-institute-code',
      data: {'code': code},
    );
    return VerifyInstituteCodeResult.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }
}

final catalogueRepositoryProvider = Provider((ref) => CatalogueRepository(ref));

/// Mirrors `toFilterableCourses()` (apps/web/lib/courses.ts): joins the
/// public course list with public product pricing, dropping any course
/// without a public product yet (nothing to buy). When a course has both a
/// PUBLIC and an INSTITUTE product, the PUBLIC one wins for catalogue display
/// — the institute price is resolved separately on the detail screen.
final filterableCoursesProvider = FutureProvider.autoDispose<
    List<FilterableCourse>>((ref) async {
  final courses = await ref.watch(publicCoursesProvider.future);
  final api = ref.watch(apiClientProvider);
  final response = await api.dio.get('/products');
  final products = (response.data['data'] as List)
      .cast<Map<String, dynamic>>()
      .map(ProductView.fromJson)
      .toList();

  final byCourseId = <String, ProductView>{};
  for (final product in products) {
    if (product.kind != 'COURSE' || product.courseId == null) continue;
    final existing = byCourseId[product.courseId];
    if (existing == null || (existing.isInstitute && !product.isInstitute)) {
      byCourseId[product.courseId!] = product;
    }
  }

  return [
    for (final course in courses)
      if (byCourseId[course.id] case final product?)
        FilterableCourse(course: course, product: product),
  ];
});
