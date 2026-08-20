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
/// available, same as web's `isStudent`-conditional rendering. Visual
/// treatment (bordered filter bar, soft-shadow cards, heart overlay,
/// validity pill) mirrors `CoursesFilterGrid.tsx`; filters open as bottom
/// sheets rather than web's native `<select>`s — the more reliable pattern
/// on a touch screen, and it gives room for a visible "Reset" action.
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

  bool get _hasActiveFilters =>
      _examId != null || _stateId != null || _audience != _Audience.all || _sort != _SortBy.newest;

  void _resetFilters() {
    setState(() {
      _examId = null;
      _stateId = null;
      _audience = _Audience.all;
      _sort = _SortBy.newest;
    });
  }

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

  Future<void> _pickExam(List<ExamRef> exams) async {
    final picked = await _showPicker<String?>(
      title: 'Exam',
      options: [
        const _PickerOption(value: null, label: 'All exams'),
        for (final exam in exams) _PickerOption(value: exam.id, label: exam.nameEn),
      ],
      selected: _examId,
    );
    if (picked != _Sentinel.none) setState(() => _examId = picked as String?);
  }

  Future<void> _pickState(List<StateRef> states) async {
    final picked = await _showPicker<String?>(
      title: 'State',
      options: [
        const _PickerOption(value: null, label: 'All states'),
        for (final state in states) _PickerOption(value: state.id, label: state.nameEn),
      ],
      selected: _stateId,
    );
    if (picked != _Sentinel.none) setState(() => _stateId = picked as String?);
  }

  Future<void> _pickAudience() async {
    final picked = await _showPicker<_Audience>(
      title: 'Access type',
      options: const [
        _PickerOption(value: _Audience.all, label: 'All access types'),
        _PickerOption(value: _Audience.public, label: 'Public'),
        _PickerOption(value: _Audience.institute, label: 'Institute-affiliated'),
      ],
      selected: _audience,
    );
    if (picked != _Sentinel.none) setState(() => _audience = picked as _Audience);
  }

  Future<void> _pickSort() async {
    final picked = await _showPicker<_SortBy>(
      title: 'Sort by',
      options: const [
        _PickerOption(value: _SortBy.newest, label: 'Newest'),
        _PickerOption(value: _SortBy.popular, label: 'Most popular'),
        _PickerOption(value: _SortBy.rating, label: 'Highest rated'),
      ],
      selected: _sort,
    );
    if (picked != _Sentinel.none) setState(() => _sort = picked as _SortBy);
  }

  Future<Object?> _showPicker<T>({
    required String title,
    required List<_PickerOption<T>> options,
    required T selected,
  }) {
    return showModalBottomSheet<Object?>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(title, style: Theme.of(context).textTheme.titleMedium),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(_Sentinel.none),
                    ),
                  ],
                ),
              ),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final option in options)
                      ListTile(
                        title: Text(option.label),
                        trailing: option.value == selected
                            ? const Icon(Icons.check_circle, color: AppColors.teal500)
                            : null,
                        onTap: () => Navigator.of(context).pop(option.value),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
      backgroundColor: AppColors.surfaceSoft,
      appBar: AppBar(
        title: const Text('RajyaRank'),
        actions: [
          if (!signedIn)
            TextButton(
              // go, not push: pushing '/login' on top of '/courses' leaves it
              // stacked, and the post-login redirect to '/dashboard' doesn't
              // cleanly unwind that — login would succeed server-side (every
              // time) but the screen would never actually advance.
              onPressed: () => context.go('/login'),
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
            final examList = exams.maybeWhen(data: (l) => l, orElse: () => const <ExamRef>[]);
            final stateList = states.maybeWhen(data: (l) => l, orElse: () => const <StateRef>[]);
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text('All courses', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 4),
                const Text(
                  'Browse all available courses, filter them, and buy right here.',
                  style: TextStyle(color: AppColors.muted),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextField(
                        controller: _searchController,
                        onChanged: (v) => setState(() => _query = v),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: 'Search course, exam, or state',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          suffixIcon: _query.isEmpty
                              ? null
                              : IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _query = '');
                                  },
                                ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _FilterChip(
                            label: _examId == null
                                ? 'Exam'
                                : examList.firstWhere((e) => e.id == _examId).nameEn,
                            active: _examId != null,
                            onTap: () => _pickExam(examList),
                          ),
                          _FilterChip(
                            label: _stateId == null
                                ? 'State'
                                : stateList.firstWhere((s) => s.id == _stateId).nameEn,
                            active: _stateId != null,
                            onTap: () => _pickState(stateList),
                          ),
                          _FilterChip(
                            label: switch (_audience) {
                              _Audience.all => 'Access type',
                              _Audience.public => 'Public',
                              _Audience.institute => 'Institute',
                            },
                            active: _audience != _Audience.all,
                            onTap: _pickAudience,
                          ),
                          _FilterChip(
                            icon: Icons.sort_rounded,
                            label: switch (_sort) {
                              _SortBy.newest => 'Newest',
                              _SortBy.popular => 'Most popular',
                              _SortBy.rating => 'Highest rated',
                            },
                            active: _sort != _SortBy.newest,
                            onTap: _pickSort,
                          ),
                          if (_hasActiveFilters)
                            ActionChip(
                              avatar: const Icon(Icons.refresh_rounded, size: 16, color: AppColors.orange600),
                              label: const Text('Reset', style: TextStyle(color: AppColors.orange600, fontWeight: FontWeight.w700)),
                              backgroundColor: AppColors.orange100,
                              side: BorderSide.none,
                              onPressed: _resetFilters,
                            ),
                        ],
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
                      examName: examList
                          .cast<ExamRef?>()
                          .firstWhere((e) => e?.id == item.course.examId, orElse: () => null)
                          ?.nameEn,
                    ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Sentinel distinguishing "picker closed with no selection" (dismissed via
/// the X / tapping outside) from "explicitly picked null" (e.g. "All exams",
/// a legitimate `T? == null` value) — both come back as `null` from
/// `showModalBottomSheet` otherwise, and conflating them meant dismissing the
/// sheet without choosing anything silently reset the filter.
enum _Sentinel { none }

class _PickerOption<T> {
  const _PickerOption({required this.value, required this.label});
  final T value;
  final String label;
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: active ? AppColors.navy900 : Colors.white,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: active ? AppColors.navy900 : AppColors.line),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: active ? Colors.white : AppColors.muted),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : AppColors.ink,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.expand_more_rounded,
                size: 16,
                color: active ? Colors.white : AppColors.muted,
              ),
            ],
          ),
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
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
        boxShadow: const [
          BoxShadow(color: Color(0x0D0F172A), blurRadius: 28, offset: Offset(0, 10)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/courses/${course.id}'),
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: EdgeInsets.only(right: signedIn ? 36 : 0),
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          if (examName != null) _Pill(text: examName!),
                          _Pill(
                            text: course.isInstitute ? (course.orgName ?? 'Institute') : 'Public',
                            color: course.isInstitute ? AppColors.orange100 : AppColors.teal100,
                            textColor: course.isInstitute ? AppColors.orange600 : AppColors.teal600,
                          ),
                          if (course.isNew)
                            _Pill(text: 'New', color: AppColors.navy100, textColor: AppColors.navy800),
                        ],
                      ),
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
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(top: 12),
                      decoration: const BoxDecoration(
                        border: Border(top: BorderSide(color: AppColors.line)),
                      ),
                      child: owned
                          ? Row(
                              children: [
                                const Icon(Icons.check_circle, size: 16, color: AppColors.success),
                                const SizedBox(width: 6),
                                const Text(
                                  'Enrolled',
                                  style: TextStyle(color: AppColors.success, fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                                const Spacer(),
                                const Text(
                                  'Continue learning →',
                                  style: TextStyle(color: AppColors.navy900, fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                              ],
                            )
                          : Column(
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
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    _Pill(
                                      text: product.validityDays == null
                                          ? 'Lifetime'
                                          : '${product.validityDays} days validity',
                                      color: AppColors.surfaceSoft,
                                      textColor: AppColors.muted,
                                    ),
                                    const Spacer(),
                                    const Text(
                                      'View syllabus →',
                                      style: TextStyle(color: AppColors.navy900, fontWeight: FontWeight.w600, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                    ),
                  ],
                ),
              ),
              if (signedIn)
                Positioned(
                  top: 12,
                  right: 12,
                  child: Material(
                    color: Colors.white.withValues(alpha: 0.92),
                    shape: const CircleBorder(),
                    elevation: 1,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () async {
                        await ref.read(wishlistRepositoryProvider).toggle(course.id);
                        ref.invalidate(wishlistCourseIdsProvider);
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(7),
                        child: Icon(
                          wishlisted ? Icons.favorite : Icons.favorite_border,
                          size: 18,
                          color: wishlisted ? AppColors.orange500 : AppColors.muted,
                        ),
                      ),
                    ),
                  ),
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
