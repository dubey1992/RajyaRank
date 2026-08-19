import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import 'course_models.dart';

final myCoursesProvider =
    FutureProvider.autoDispose<List<StudentCourseSummary>>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/courses');
      return (response.data['data'] as List)
          .cast<Map<String, dynamic>>()
          .map(StudentCourseSummary.fromJson)
          .toList();
    });

final instituteCoursesProvider =
    FutureProvider.autoDispose<List<InstituteCourseSummary>>((ref) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get('/student/institute-courses');
      return (response.data['data'] as List)
          .cast<Map<String, dynamic>>()
          .map(InstituteCourseSummary.fromJson)
          .toList();
    });

final courseCurriculumProvider = FutureProvider.autoDispose
    .family<StudentCourseDetail, String>((ref, courseId) async {
      final api = ref.watch(apiClientProvider);
      final response = await api.dio.get(
        '/student/courses/$courseId/curriculum',
      );
      return StudentCourseDetail.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    });
