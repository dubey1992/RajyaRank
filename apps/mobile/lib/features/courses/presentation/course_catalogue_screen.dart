import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../wishlist/data/wishlist_repository.dart';
import '../data/catalogue_models.dart';
import '../data/catalogue_repository.dart';
import '../data/course_repository.dart';

enum _Audience { all, public, institute }

enum _SortBy { newest, popular, rating }

/// The public course catalogue — matches web's `/courses` page
/// (apps/web/app/[locale]/courses/page.tsx): browsable and filterable
/// without signing in first (see `_isCoursesBrowsing` in app_router.dart).
/// Signed-in extras (wishlist heart, "Enrolled" badge) layer on top when
/// available, same as web's `isStudent`-conditional rendering.
class CourseCatalogueScreen extends ConsumerStatefulWidget {
  const CourseCatalogueScreen({super.key});

  @override
  ConsumerState<CourseCatalogueScreen> createState() =>
      _CourseCatalogueScreenState();
}

class _CourseCatalogueScreenState extends ConsumerState<CourseCatalogueScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  String? _examId;
  String? _stateId;
  _Audience _audience = _Audience.all;
  _SortBy _sort = _SortBy.newest;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<FilterableCourse> _apply(List<FilterableCourse> items) {
    final q = _query.trim().toLowerCase();
    var filtered = items.where((f) {
      final c = f.course;
      if (q.isNotEmpty &&
          !('${c.code} ${c.titleEn}').toLowerCase().contains(q)) {
        return false;
      }
      if (_examId != null && c.examId != _examId) return false;
      if (_stateId != null && c.stateId != _stateId) return false;
      if (_audience == _Audience.public && c.isInstitute) return false;
      if (_audience == _Audience.institute && !c.isInstitute) return false;
      return true;
    }).toList();

    filtered.sort((a, b) {
      switch (_sort) {
        case _SortBy.newest:
          return b.course.createdAt.compareTo(a.course.createdAt);
        case _SortBy.popular:
          return b.course.enrollmentCount.compareTo(a.course.enrollmentCount);
        case _SortBy.rating:
          final byRating = b.course.avgRating.compareTo(a.course.avgRating);
          if (byRating != 0) return byRating;
          return b.course.ratingCount.compareTo(a.course.ratingCount);
      }
    });
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final authStatus = ref.watch(authControllerProvider).status;
    final signedIn = authStatus == AuthStatus.signedIn;
    final courses = ref.watch(filterableCoursesProvider);
    final exams = ref.watch(examsProvider);
    final states = ref.watch(statesProvider);
    final ownedIds = signedIn
        ? ref.watch(myCoursesProvider).maybeWhen(
            data: (list) => list.map((c) => c.courseId).toSet(),
            orElse: () => const <String>{},
          )
        : const <String>{};
    final wishlistIds = signedIn
        ? ref.watch(wishlistCourseIdsProvider).maybeWhen(
            data: (ids) => ids,
            orElse: () => const <String>{},
          )
        : const <String>{};

    return Scaffold(
      appBar: AppBar(
        title: const Text('Courses'),
        actions: [
          if (!signedIn)
            TextButton(
              onPressed: () => context.push('/login'),
              style: TextButton.styleFrom(foregroundColor: Colors.white),
              child: const Text('Log in'),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(filterableCoursesProvider);
          ref.invalidate(examsProvider);
          ref.invalidate(statesProvider);
        },
        child: courses.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => _ErrorState(
            message: apiErrorMessage(error),
            onRetry: () => ref.invalidate(filterableCoursesProvider),
          ),
          data: (all) {
            final visible = _apply(all);
            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: 'Search courses',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _query.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _query = '');
                            },
                          ),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      exams.maybeWhen(
                        data: (list) => _ExamFilterChip(
                          exams: list,
                          value: _examId,
                          onChanged: (v) => setState(() => _examId = v),
                        ),
                        orElse: () => const SizedBox.shrink(),
                      ),
                      const SizedBox(width: 8),
                      states.maybeWhen(
                        data: (list) => _StateFilterChip(
                          states: list,
                          value: _stateId,
                          onChanged: (v) => setState(() => _stateId = v),
                        ),
                        orElse: () => const SizedBox.shrink(),
                      ),
                      const SizedBox(width: 8),
                      _AudienceFilterChip(
                        value: _audience,
                        onChanged: (v) => setState(() => _audience = v),
                      ),
                      const SizedBox(width: 8),
                      _SortChip(
                        value: _sort,
                        onChanged: (v) => setState(() => _sort = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '${visible.length} course${visible.length == 1 ? '' : 's'}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const SizedBox(height: 8),
                if (visible.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: Center(
                      child: Text(
                        'No courses match these filters.',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ),
                  )
                else
                  for (final item in visible)
                    _CourseCard(
                      item: item,
                      owned: ownedIds.contains(item.course.id),
                      wishlisted: wishlistIds.contains(item.course.id),
                      signedIn: signedIn,
                      examName: exams.maybeWhen(
                        data: (list) => list
                            .cast<ExamRef?>()
                            .firstWhere(
                              (e) => e?.id == item.course.examId,
                              orElse: () => null,
                            )
                            ?.nameEn,
                        orElse: () => null,
                      ),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ExamFilterChip extends StatelessWidget {
  const _ExamFilterChip({
    required this.exams,
    required this.value,
    required this.onChanged,
  });

  final List<ExamRef> exams;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return _DropdownChip<String?>(
      label: value == null
          ? 'Exam'
          : exams.firstWhere((e) => e.id == value).nameEn,
      selected: value != null,
      items: [
        const PopupMenuItem(value: null, child: Text('All exams')),
        for (final exam in exams)
          PopupMenuItem(value: exam.id, child: Text(exam.nameEn)),
      ],
      onSelected: onChanged,
    );
  }
}

class _StateFilterChip extends StatelessWidget {
  const _StateFilterChip({
    required this.states,
    required this.value,
    required this.onChanged,
  });

  final List<StateRef> states;
  final String? value;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    return _DropdownChip<String?>(
      label: value == null
          ? 'State'
          : states.firstWhere((s) => s.id == value).nameEn,
      selected: value != null,
      items: [
        const PopupMenuItem(value: null, child: Text('All states')),
        for (final state in states)
          PopupMenuItem(value: state.id, child: Text(state.nameEn)),
      ],
      onSelected: onChanged,
    );
  }
}

class _AudienceFilterChip extends StatelessWidget {
  const _AudienceFilterChip({required this.value, required this.onChanged});

  final _Audience value;
  final ValueChanged<_Audience> onChanged;

  @override
  Widget build(BuildContext context) {
    return _DropdownChip<_Audience>(
      label: switch (value) {
        _Audience.all => 'All courses',
        _Audience.public => 'Public',
        _Audience.institute => 'Institute',
      },
      selected: value != _Audience.all,
      items: const [
        PopupMenuItem(value: _Audience.all, child: Text('All courses')),
        PopupMenuItem(value: _Audience.public, child: Text('Public')),
        PopupMenuItem(value: _Audience.institute, child: Text('Institute')),
      ],
      onSelected: onChanged,
    );
  }
}

class _SortChip extends StatelessWidget {
  const _SortChip({required this.value, required this.onChanged});

  final _SortBy value;
  final ValueChanged<_SortBy> onChanged;

  @override
  Widget build(BuildContext context) {
    return _DropdownChip<_SortBy>(
      icon: Icons.sort_rounded,
      label: switch (value) {
        _SortBy.newest => 'Newest',
        _SortBy.popular => 'Most popular',
        _SortBy.rating => 'Highest rated',
      },
      selected: value != _SortBy.newest,
      items: const [
        PopupMenuItem(value: _SortBy.newest, child: Text('Newest')),
        PopupMenuItem(value: _SortBy.popular, child: Text('Most popular')),
        PopupMenuItem(value: _SortBy.rating, child: Text('Highest rated')),
      ],
      onSelected: onChanged,
    );
  }
}

class _DropdownChip<T> extends StatelessWidget {
  const _DropdownChip({
    required this.label,
    required this.selected,
    required this.items,
    required this.onSelected,
    this.icon,
    super.key,
  });

  final String label;
  final bool selected;
  final List<PopupMenuItem<T>> items;
  final ValueChanged<T> onSelected;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<T>(
      itemBuilder: (context) => items,
      onSelected: onSelected,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: selected ? AppColors.navy900 : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.navy900 : AppColors.line,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 15,
                color: selected ? Colors.white : AppColors.muted,
              ),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.ink,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.expand_more_rounded,
              size: 16,
              color: selected ? Colors.white : AppColors.muted,
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseCard extends ConsumerWidget {
  const _CourseCard({
    required this.item,
    required this.owned,
    required this.wishlisted,
    required this.signedIn,
    required this.examName,
  });

  final FilterableCourse item;
  final bool owned;
  final bool wishlisted;
  final bool signedIn;
  final String? examName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final course = item.course;
    final product = item.product;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/courses/${course.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        if (examName != null) _Pill(text: examName!),
                        _Pill(
                          text: course.isInstitute
                              ? (course.orgName ?? 'Institute')
                              : 'Public',
                          color: course.isInstitute
                              ? AppColors.orange100
                              : AppColors.teal100,
                          textColor: course.isInstitute
                              ? AppColors.orange600
                              : AppColors.teal600,
                        ),
                        if (course.isNew)
                          _Pill(
                            text: 'New',
                            color: AppColors.navy100,
                            textColor: AppColors.navy800,
                          ),
                      ],
                    ),
                  ),
                  if (signedIn)
                    InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () async {
                        await ref.read(wishlistRepositoryProvider).toggle(course.id);
                        ref.invalidate(wishlistCourseIdsProvider);
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Icon(
                          wishlisted ? Icons.favorite : Icons.favorite_border,
                          size: 20,
                          color: wishlisted
                              ? AppColors.orange500
                              : AppColors.muted,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(course.titleEn, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              Row(
                children: [
                  if (course.ratingCount > 0) ...[
                    const Icon(Icons.star_rounded, size: 15, color: AppColors.orange500),
                    const SizedBox(width: 3),
                    Text(
                      '${course.avgRating.toStringAsFixed(1)} (${course.ratingCount})',
                      style: const TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                    const SizedBox(width: 10),
                  ],
                  if (course.enrollmentCount > 0)
                    Text(
                      '${course.enrollmentCount} enrolled',
                      style: const TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              if (owned)
                Row(
                  children: [
                    const Icon(Icons.check_circle, size: 16, color: AppColors.success),
                    const SizedBox(width: 6),
                    const Text(
                      'Enrolled',
                      style: TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      'Continue learning →',
                      style: const TextStyle(
                        color: AppColors.navy900,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                )
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      product.isFree
                          ? 'Free'
                          : '₹${product.priceRupees.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.navy900,
                      ),
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
                    const Spacer(),
                    const Text(
                      'View syllabus →',
                      style: TextStyle(
                        color: AppColors.navy900,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, this.color, this.textColor});

  final String text;
  final Color? color;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color ?? AppColors.navy100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor ?? AppColors.navy800,
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
