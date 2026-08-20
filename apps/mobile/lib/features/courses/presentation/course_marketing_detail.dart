import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../payments/data/payment_models.dart';
import '../../payments/data/payment_repository.dart';
import '../../payments/presentation/checkout_sheet.dart';
import '../../wishlist/data/wishlist_repository.dart';
import '../data/catalogue_models.dart';
import '../data/catalogue_repository.dart';

/// Pre-purchase course view — matches web's `/courses/{id}` page: the same
/// syllabus/pricing/ratings content for anonymous and signed-in-not-yet-
/// enrolled visitors alike, differing only in the buy CTA and wishlist
/// visibility. Shown by [CourseDetailScreen] whenever the course isn't
/// already owned; the progress-aware curriculum view (web's `/my-courses/{id}`
/// equivalent) is a separate branch for owned courses.
class CourseMarketingDetail extends ConsumerStatefulWidget {
  const CourseMarketingDetail({
    super.key,
    required this.courseId,
    required this.signedIn,
  });

  final String courseId;
  final bool signedIn;

  @override
  ConsumerState<CourseMarketingDetail> createState() =>
      _CourseMarketingDetailState();
}

class _CourseMarketingDetailState extends ConsumerState<CourseMarketingDetail> {
  final _codeController = TextEditingController();
  bool _showCodeField = false;
  bool _verifying = false;
  String? _codeError;
  VerifyInstituteCodeResult? _verified;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verifyCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _verifying = true;
      _codeError = null;
    });
    try {
      final result = await ref
          .read(catalogueRepositoryProvider)
          .verifyInstituteCode(courseId: widget.courseId, code: code);
      setState(() {
        _verified = result;
        if (!result.valid) _codeError = 'That code isn\'t valid for this course.';
      });
    } catch (error) {
      setState(() => _codeError = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final outline = ref.watch(courseOutlineProvider(widget.courseId));
    final ratings = ref.watch(courseRatingsProvider(widget.courseId));
    final products = ref.watch(productsProvider);
    final wishlistIds = widget.signedIn
        ? ref.watch(wishlistCourseIdsProvider).maybeWhen(
            data: (ids) => ids,
            orElse: () => const <String>{},
          )
        : const <String>{};
    final wishlisted = wishlistIds.contains(widget.courseId);

    return outline.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
        ),
      ),
      data: (course) {
        if (course == null) {
          return const Center(child: Text('This course is not available.'));
        }
        final product = products.maybeWhen(
          data: (list) => list
              .cast<ProductView?>()
              .firstWhere(
                (p) =>
                    p?.kind == 'COURSE' &&
                    p?.courseId == widget.courseId &&
                    !p!.isInstitute,
                orElse: () => null,
              ),
          orElse: () => null,
        );

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    course.titleEn,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                if (widget.signedIn)
                  IconButton(
                    icon: Icon(
                      wishlisted ? Icons.favorite : Icons.favorite_border,
                      color: wishlisted ? AppColors.orange500 : AppColors.muted,
                    ),
                    onPressed: () async {
                      await ref
                          .read(wishlistRepositoryProvider)
                          .toggle(widget.courseId);
                      ref.invalidate(wishlistCourseIdsProvider);
                    },
                  ),
              ],
            ),
            if (course.descEn != null && course.descEn!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(course.descEn!, style: const TextStyle(color: AppColors.muted)),
            ],
            const SizedBox(height: 18),
            _BuyBox(
              orgId: course.orgId,
              orgName: course.orgName,
              publicProduct: product,
              signedIn: widget.signedIn,
              codeController: _codeController,
              showCodeField: _showCodeField,
              onToggleCodeField: () =>
                  setState(() => _showCodeField = !_showCodeField),
              verifying: _verifying,
              codeError: _codeError,
              verified: _verified,
              onVerify: _verifyCode,
            ),
            if (course.learningOutcomes.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text("What you'll learn", style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 10),
              for (final outcome in course.learningOutcomes)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle, size: 18, color: AppColors.teal500),
                      const SizedBox(width: 8),
                      Expanded(child: Text(outcome)),
                    ],
                  ),
                ),
            ],
            const SizedBox(height: 24),
            Text('Syllabus', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final subject in course.subjects)
              _SyllabusSubjectTile(subject: subject),
            const SizedBox(height: 24),
            Text('Ratings & reviews', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ratings.when(
              loading: () =>
                  const Padding(padding: EdgeInsets.all(12), child: LinearProgressIndicator()),
              error: (_, _) => const SizedBox.shrink(),
              data: (r) => _RatingsSection(ratings: r),
            ),
          ],
        );
      },
    );
  }
}

class _BuyBox extends StatelessWidget {
  const _BuyBox({
    required this.orgId,
    required this.orgName,
    required this.publicProduct,
    required this.signedIn,
    required this.codeController,
    required this.showCodeField,
    required this.onToggleCodeField,
    required this.verifying,
    required this.codeError,
    required this.verified,
    required this.onVerify,
  });

  final String? orgId;
  final String? orgName;
  final ProductView? publicProduct;
  final bool signedIn;
  final TextEditingController codeController;
  final bool showCodeField;
  final VoidCallback onToggleCodeField;
  final bool verifying;
  final String? codeError;
  final VerifyInstituteCodeResult? verified;
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    if (publicProduct == null && verified?.product == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Expanded(child: Text('Pricing for this course isn\'t set up yet.')),
              TextButton(
                onPressed: () => context.push('/pricing'),
                child: const Text('See plans'),
              ),
            ],
          ),
        ),
      );
    }

    final activeProduct = (verified?.valid ?? false)
        ? verified!.product
        : publicProduct;

    return Card(
      color: AppColors.navy900,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  activeProduct == null
                      ? '—'
                      : (activeProduct.isFree
                          ? 'Free'
                          : '₹${activeProduct.priceRupees.toStringAsFixed(0)}'),
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                if (activeProduct?.originalPriceRupees != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    '₹${activeProduct!.originalPriceRupees!.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.white70,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ],
                if (verified?.valid ?? false) ...[
                  const SizedBox(width: 8),
                  const Text(
                    'Institute price',
                    style: TextStyle(color: AppColors.teal100, fontSize: 12),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Text(
              activeProduct?.validityDays == null
                  ? 'Lifetime access'
                  : '${activeProduct!.validityDays} days access',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.navy900,
                ),
                onPressed: activeProduct == null
                    ? null
                    : () {
                        if (!signedIn) {
                          // go, not push — see course_catalogue_screen.dart's
                          // "Log in" button for why.
                          context.go('/login');
                          return;
                        }
                        showCheckoutSheet(
                          context,
                          activeProduct,
                          accessCode: (verified?.valid ?? false)
                              ? codeController.text.trim()
                              : null,
                        );
                      },
                child: Text(signedIn ? 'Buy now' : 'Log in to buy'),
              ),
            ),
            if (orgId != null && !(verified?.valid ?? false)) ...[
              const SizedBox(height: 10),
              TextButton(
                onPressed: onToggleCodeField,
                style: TextButton.styleFrom(foregroundColor: Colors.white70),
                child: Text(
                  showCodeField
                      ? 'Hide institute code field'
                      : 'Have a code from ${orgName ?? 'your institute'}?',
                ),
              ),
              if (showCodeField) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: codeController,
                        textCapitalization: TextCapitalization.characters,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(
                          hintText: 'Access code',
                          hintStyle: TextStyle(color: Colors.white54),
                          fillColor: Colors.white12,
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.white24),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white54),
                      ),
                      onPressed: verifying ? null : onVerify,
                      child: verifying
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text('Verify'),
                    ),
                  ],
                ),
                if (codeError != null) ...[
                  const SizedBox(height: 6),
                  Text(codeError!, style: const TextStyle(color: AppColors.orange100, fontSize: 12)),
                ],
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _SyllabusSubjectTile extends StatelessWidget {
  const _SyllabusSubjectTile({required this.subject});

  final CourseOutlineSubject subject;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        title: Text(subject.nameEn, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${subject.lessons.length} lessons'),
        children: [
          for (final lesson in subject.lessons)
            ListTile(
              leading: Icon(_lessonIcon(lesson.lessonType), color: AppColors.navy800),
              title: Text(lesson.titleEn),
              subtitle: lesson.estimatedMinutes == null
                  ? null
                  : Text('${lesson.estimatedMinutes} min'),
              trailing: lesson.freePreview
                  ? const _Pill(text: 'Preview')
                  : const Icon(Icons.lock_outline, size: 18, color: AppColors.muted),
            ),
        ],
      ),
    );
  }

  IconData _lessonIcon(String type) {
    final t = type.toUpperCase();
    if (t == 'PDF' || t == 'TEXT') return Icons.picture_as_pdf_outlined;
    if (t == 'QUIZ') return Icons.quiz_outlined;
    return Icons.play_circle_outline;
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.teal100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.teal600,
        ),
      ),
    );
  }
}

class _RatingsSection extends StatelessWidget {
  const _RatingsSection({required this.ratings});

  final CourseRatings ratings;

  @override
  Widget build(BuildContext context) {
    if (ratings.count == 0) {
      return const Text('No ratings yet.', style: TextStyle(color: AppColors.muted));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              ratings.average.toStringAsFixed(1),
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: List.generate(
                    5,
                    (i) => Icon(
                      i < ratings.average.round() ? Icons.star_rounded : Icons.star_outline_rounded,
                      size: 16,
                      color: AppColors.orange500,
                    ),
                  ),
                ),
                Text(
                  '${ratings.count} rating${ratings.count == 1 ? '' : 's'}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 14),
        for (final item in ratings.ratings.take(5))
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(item.userName, style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                    Row(
                      children: List.generate(
                        5,
                        (i) => Icon(
                          i < item.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                          size: 13,
                          color: AppColors.orange500,
                        ),
                      ),
                    ),
                  ],
                ),
                if (item.comment != null && item.comment!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(item.comment!),
                ],
              ],
            ),
          ),
      ],
    );
  }
}
