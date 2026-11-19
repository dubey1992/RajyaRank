import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/pill_badge.dart';
import '../data/live_class_models.dart';
import '../data/live_class_repository.dart';

class LiveClassesScreen extends ConsumerWidget {
  const LiveClassesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classes = ref.watch(upcomingLiveClassesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Live Classes')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(upcomingLiveClassesProvider),
        child: classes.when(
          data: (items) => items.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(height: 80),
                    EmptyState(
                      icon: Icons.videocam_outlined,
                      title: 'No live classes right now',
                      message: 'Check back later — your institute will schedule new sessions here.',
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, i) => _LiveClassCard(item: items[i]),
                ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Text(
              'Could not load live classes.',
              style: TextStyle(color: AppColors.muted),
            ),
          ),
        ),
      ),
    );
  }
}

// dd/mm/yyyy — the one date format used across the whole app (see
// order_history_screen.dart#_formatDate) — plus a 12-hour time, since this
// is a scheduled event, not just a historical record.
String _formatStartsAt(DateTime date) {
  final dd = date.day.toString().padLeft(2, '0');
  final mm = date.month.toString().padLeft(2, '0');
  final hour12 = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final period = date.hour < 12 ? 'AM' : 'PM';
  return '$dd/$mm/${date.year}, $hour12:$minute $period';
}

class _LiveClassCard extends StatelessWidget {
  const _LiveClassCard({required this.item});

  final LiveClass item;

  @override
  Widget build(BuildContext context) {
    final timeLabel = _formatStartsAt(item.startsAt);
    return AppCard(
      onTap: item.canJoin
          ? () => context.push('/live-classes/${item.id}/join')
          : null,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (item.isLiveNow)
                      const Padding(
                        padding: EdgeInsets.only(right: 8),
                        child: PillBadge(label: 'LIVE', tone: PillTone.orange),
                      ),
                    Expanded(
                      child: Text(
                        item.titleEn,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 15,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.courseTitleEn,
                  style: TextStyle(color: AppColors.muted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Text(
                  '$timeLabel · ${item.durationMinutes} min',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    color: AppColors.navy800,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: item.canJoin ? AppColors.orange500 : AppColors.line,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              item.canJoin ? 'Join' : 'Soon',
              style: TextStyle(
                color: item.canJoin ? Colors.white : AppColors.muted,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
