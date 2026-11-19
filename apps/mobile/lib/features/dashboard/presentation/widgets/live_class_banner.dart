import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_card.dart';
import '../../../../core/widgets/pill_badge.dart';
import '../../../live_classes/data/live_class_repository.dart';

/// Surfaces the single next upcoming/live class on the dashboard — the
/// actual Join action lives on the full /live-classes list (where the join
/// call + webview can run), this is purely a "something's coming up, go
/// look" nudge. Renders nothing while loading, on error, or when there's
/// nothing scheduled, so it never pushes other dashboard content down with
/// an empty-state box.
class LiveClassBanner extends ConsumerWidget {
  const LiveClassBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classes = ref.watch(upcomingLiveClassesProvider);
    return classes.maybeWhen(
      data: (items) {
        if (items.isEmpty) return const SizedBox.shrink();
        final next = items.first;
        return AppCard(
          onTap: () => context.push('/live-classes'),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PillBadge(
                      label: next.isLiveNow
                          ? 'LIVE NOW'
                          : 'UPCOMING LIVE CLASS',
                      tone: next.isLiveNow ? PillTone.orange : PillTone.navy,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      next.titleEn,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.muted),
            ],
          ),
        );
      },
      orElse: () => const SizedBox.shrink(),
    );
  }
}
