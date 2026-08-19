import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/current_affairs_models.dart';
import '../data/current_affairs_repository.dart';

class CurrentAffairsScreen extends ConsumerWidget {
  const CurrentAffairsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(currentAffairsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Current Affairs')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(currentAffairsProvider),
        child: items.when(
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
                    'Nothing published yet.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final item = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => _CurrentAffairDetailScreen(item: item),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.navy100,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      item.category,
                                      style: const TextStyle(
                                        color: AppColors.navy900,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  if (item.isNew) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 3,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.orange100,
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: const Text(
                                        'NEW',
                                        style: TextStyle(
                                          color: AppColors.orange600,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                item.titleEn,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

class _CurrentAffairDetailScreen extends StatelessWidget {
  const _CurrentAffairDetailScreen({required this.item});
  final CurrentAffairItem item;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(item.category)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.titleEn, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(
              '${item.publishedAt.day}/${item.publishedAt.month}/${item.publishedAt.year}',
              style: const TextStyle(color: AppColors.muted, fontSize: 12),
            ),
            const SizedBox(height: 16),
            Text(item.bodyEn, style: const TextStyle(height: 1.5)),
          ],
        ),
      ),
    );
  }
}
