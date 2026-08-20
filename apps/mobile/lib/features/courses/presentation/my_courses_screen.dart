import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../payments/data/payment_models.dart';
import '../../payments/data/payment_repository.dart';
import '../../payments/presentation/checkout_sheet.dart';
import '../data/course_models.dart';
import '../data/course_repository.dart';

class MyCoursesScreen extends ConsumerWidget {
  const MyCoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final owned = ref.watch(myCoursesProvider);
    final institute = ref.watch(instituteCoursesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Courses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.explore_outlined),
            tooltip: 'Explore courses',
            onPressed: () => context.push('/courses'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myCoursesProvider);
          ref.invalidate(instituteCoursesProvider);
        },
        child: owned.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(
            message: apiErrorMessage(error),
            onRetry: () => ref.invalidate(myCoursesProvider),
          ),
          data: (courses) {
            final instituteOnly = institute.maybeWhen(
              data: (list) => list.where((c) => !c.entitled).toList(),
              orElse: () => const <InstituteCourseSummary>[],
            );
            if (courses.isEmpty && instituteOnly.isEmpty) {
              return const _EmptyState();
            }
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                for (final course in courses)
                  _OwnedCourseCard(
                    course: course,
                    onTap: () => context.push('/courses/${course.courseId}'),
                  ),
                if (instituteOnly.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    "Your institute's courses",
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    "Courses made available by your institute that you haven't bought yet.",
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                  ),
                  const SizedBox(height: 10),
                  for (final course in instituteOnly)
                    _InstituteCourseCard(course: course),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _OwnedCourseCard extends StatelessWidget {
  const _OwnedCourseCard({required this.course, required this.onTap});

  final StudentCourseSummary course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                course.titleEn,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                '${course.lessonsCompleted} / ${course.lessonsTotal} lessons complete',
                style: const TextStyle(color: AppColors.muted, fontSize: 13),
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: course.percentComplete / 100,
                  minHeight: 8,
                  backgroundColor: AppColors.line,
                  color: AppColors.teal500,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${course.percentComplete}% complete',
                style: const TextStyle(color: AppColors.muted, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Mirrors web's `my-courses/page.tsx` "Your institute's courses" section:
/// resolves pricing inline via `/student/courses/:id/pricing` and buys
/// directly from this card — deliberately NOT a link to `/courses/{id}`,
/// since an institute-only (PRIVATE-visibility) course never appears in the
/// public catalogue and that route would 404 for it.
class _InstituteCourseCard extends ConsumerWidget {
  const _InstituteCourseCard({required this.course});

  final InstituteCourseSummary course;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pricing = ref.watch(coursePricingProvider(course.courseId));

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    course.titleEn,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
                if (!course.isPubliclyLinkable)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.orange100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'Institute only',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.orange600),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            pricing.when(
              loading: () => const SizedBox(
                height: 20,
                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
              error: (_, _) => const Text(
                'Could not load pricing.',
                style: TextStyle(color: AppColors.muted, fontSize: 12),
              ),
              data: (resolved) {
                final view = (resolved.qualifiesForInstitute && resolved.institute != null)
                    ? resolved.institute!
                    : resolved.public;
                if (view == null) {
                  return const Text(
                    'Pricing coming soon.',
                    style: TextStyle(color: AppColors.muted, fontSize: 12),
                  );
                }
                final product = ProductView(
                  id: view.id,
                  kind: 'COURSE',
                  courseId: course.courseId,
                  titleEn: course.titleEn,
                  priceMinor: view.priceMinor,
                  originalPriceMinor: view.originalPriceMinor,
                  currency: view.currency,
                  validityDays: null,
                  accessType: '',
                  audience: resolved.qualifiesForInstitute ? 'INSTITUTE' : 'PUBLIC',
                );
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          product.isFree ? 'Free' : '₹${product.priceRupees.toStringAsFixed(0)}',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.navy900),
                        ),
                        if (product.originalPriceRupees != null) ...[
                          const SizedBox(width: 6),
                          Text(
                            '₹${product.originalPriceRupees!.toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: AppColors.muted,
                              fontSize: 13,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () async {
                              final bought = await showCheckoutSheet(context, product);
                              if (bought == true) {
                                ref.invalidate(myCoursesProvider);
                                ref.invalidate(instituteCoursesProvider);
                              }
                            },
                            child: const Text('Buy'),
                          ),
                        ),
                        if (course.isPubliclyLinkable) ...[
                          const SizedBox(width: 10),
                          TextButton(
                            onPressed: () => context.push('/courses/${course.courseId}'),
                            child: const Text('Details'),
                          ),
                        ],
                      ],
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.menu_book_outlined,
              size: 40,
              color: AppColors.muted,
            ),
            const SizedBox(height: 12),
            const Text(
              "You haven't enrolled in any courses yet.",
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
