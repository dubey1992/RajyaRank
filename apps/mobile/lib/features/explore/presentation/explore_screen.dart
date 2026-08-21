import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../courses/data/catalogue_models.dart';
import '../../courses/data/catalogue_repository.dart';
import '../../current_affairs/data/current_affairs_models.dart';
import '../../current_affairs/data/current_affairs_repository.dart';

/// The pre-login landing screen (`/explore`) — courses, current affairs and
/// live platform stats are all browsable immediately; "Log in" is a button,
/// not a wall. Replaces the bare course catalogue as the signed-out
/// redirect target in app_router.dart, which stays reachable from here as
/// "Browse all courses" (with its full search/filter UI intact).
class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(platformStatsProvider);
    final courses = ref.watch(filterableCoursesProvider);
    final affairs = ref.watch(publicCurrentAffairsProvider);

    return Scaffold(
      backgroundColor: AppColors.surfaceSoft,
      appBar: AppBar(
        title: const Text('RajyaRank'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: TextButton(
              onPressed: () => context.go('/login'),
              style: TextButton.styleFrom(foregroundColor: Colors.white),
              child: const Text('Log in'),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(platformStatsProvider);
          ref.invalidate(filterableCoursesProvider);
          ref.invalidate(publicCurrentAffairsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.only(bottom: 28),
          children: [
            _Hero(onSearchTap: () => context.push('/courses')),
            _StatStrip(
              stats: stats,
              courseCount: courses.maybeWhen(
                data: (list) => list.length,
                orElse: () => null,
              ),
            ),
            const SizedBox(height: 8),
            _SectionHeader(
              title: 'Popular courses',
              onSeeAll: () => context.push('/courses'),
            ),
            _CourseCarousel(courses: courses),
            const SizedBox(height: 8),
            _SectionHeader(
              title: 'From current affairs',
              onSeeAll: () => context.go('/login'),
            ),
            _AffairsPreview(affairs: affairs),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: OutlinedButton(
                onPressed: () => context.push('/courses'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppColors.navy900),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Browse all courses',
                  style: TextStyle(
                    color: AppColors.navy900,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        onDestinationSelected: (i) {
          if (i == 1) context.push('/courses');
          if (i == 2) context.go('/login');
        },
        backgroundColor: Colors.white,
        indicatorColor: AppColors.navy100,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: AppColors.navy900),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            label: 'Courses',
          ),
          NavigationDestination(
            icon: Icon(Icons.login_rounded),
            label: 'Log in',
          ),
        ],
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({required this.onSearchTap});

  final VoidCallback onSearchTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 18),
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.navy100, AppColors.surfaceSoft],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your rank starts here.',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color: AppColors.navy950,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Live classes, mock tests and daily current affairs — for every '
            'state and national exam, in English and Hindi.',
            style: TextStyle(color: AppColors.muted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 14),
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onSearchTap,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 13,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.search, size: 18, color: AppColors.muted),
                    SizedBox(width: 8),
                    Text(
                      'Search UPSC, SSC, State PCS…',
                      style: TextStyle(color: AppColors.muted, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatStrip extends StatelessWidget {
  const _StatStrip({required this.stats, required this.courseCount});

  final AsyncValue<PlatformStats> stats;
  final int? courseCount;

  @override
  Widget build(BuildContext context) {
    final s = stats.maybeWhen(data: (v) => v, orElse: () => null);
    if (s == null) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.line),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          _Stat(value: _compact(s.students), label: 'Students'),
          const _StatDivider(),
          _Stat(value: _compact(s.institutes), label: 'Institutes'),
          if (courseCount != null) ...[
            const _StatDivider(),
            _Stat(value: '$courseCount', label: 'Courses live'),
          ],
        ],
      ),
    );
  }

  static String _compact(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(1)}k+';
    return '$n';
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 40, color: AppColors.line);
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 15,
                color: AppColors.navy900,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10.5, color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.onSeeAll});

  final String title;
  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 12, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          TextButton(
            onPressed: onSeeAll,
            child: const Text('See all', style: TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

class _CourseCarousel extends StatelessWidget {
  const _CourseCarousel({required this.courses});

  final AsyncValue<List<FilterableCourse>> courses;

  @override
  Widget build(BuildContext context) {
    return courses.when(
      loading: () => const SizedBox(
        height: 190,
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, _) => const _InlineError(message: "Couldn't load courses."),
      data: (all) {
        if (all.isEmpty) {
          return const _InlineEmpty(message: 'No courses live yet — check back soon.');
        }
        final popular = [...all]
          ..sort(
            (a, b) => b.course.enrollmentCount.compareTo(a.course.enrollmentCount),
          );
        final top = popular.take(8).toList();
        return SizedBox(
          height: 190,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: top.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (context, i) => _CompactCourseCard(item: top[i]),
          ),
        );
      },
    );
  }
}

class _CompactCourseCard extends StatelessWidget {
  const _CompactCourseCard({required this.item});

  final FilterableCourse item;

  @override
  Widget build(BuildContext context) {
    final course = item.course;
    final product = item.product;
    return SizedBox(
      width: 158,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/courses/${course.id}'),
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.line),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 62,
                  width: double.infinity,
                  decoration: const BoxDecoration(gradient: AppGradients.hero),
                  alignment: Alignment.center,
                  child: Text(
                    course.code.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                      letterSpacing: 0.4,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 9, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.titleEn,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            product.isFree
                                ? 'Free'
                                : '₹${product.priceRupees.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                              color: AppColors.navy900,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          if (course.ratingCount > 0)
                            Row(
                              children: [
                                const Icon(
                                  Icons.star_rounded,
                                  size: 13,
                                  color: AppColors.orange500,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  course.avgRating.toStringAsFixed(1),
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AffairsPreview extends StatelessWidget {
  const _AffairsPreview({required this.affairs});

  final AsyncValue<List<CurrentAffairItem>> affairs;

  @override
  Widget build(BuildContext context) {
    return affairs.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, _) =>
          const _InlineError(message: "Couldn't load current affairs."),
      data: (all) {
        if (all.isEmpty) {
          return const _InlineEmpty(message: 'Nothing published yet — check back soon.');
        }
        final top = all.take(3).toList();
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            children: [
              for (final item in top) _AffairRow(item: item),
            ],
          ),
        );
      },
    );
  }
}

class _AffairRow extends StatelessWidget {
  const _AffairRow({required this.item});

  final CurrentAffairItem item;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => context.go('/login'),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.line),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.navy100,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.newspaper_rounded,
                    size: 18,
                    color: AppColors.navy900,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.category.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.4,
                          color: AppColors.navy800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.titleEn,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  _timeAgo(item.publishedAt),
                  style: const TextStyle(fontSize: 10.5, color: AppColors.muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Text(message, style: const TextStyle(color: AppColors.muted, fontSize: 12.5)),
    );
  }
}

class _InlineEmpty extends StatelessWidget {
  const _InlineEmpty({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Text(message, style: const TextStyle(color: AppColors.muted, fontSize: 12.5)),
    );
  }
}
