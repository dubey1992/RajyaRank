import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/wishlist_repository.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final courses = ref.watch(wishlistCoursesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Wishlist')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(wishlistCoursesProvider),
        child: courses.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
            ),
          ),
          data: (list) => list.isEmpty
              ? const Center(
                  child: Text(
                    'Tap the heart on a course to save it here.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final course = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        title: Text(course.titleEn),
                        trailing: IconButton(
                          icon: const Icon(Icons.favorite, color: AppColors.danger),
                          onPressed: () async {
                            await ref
                                .read(wishlistRepositoryProvider)
                                .toggle(course.id);
                            ref.invalidate(wishlistCoursesProvider);
                            ref.invalidate(wishlistCourseIdsProvider);
                          },
                        ),
                        onTap: () => context.push('/courses/${course.id}'),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
