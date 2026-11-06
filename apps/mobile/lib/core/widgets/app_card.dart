import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// `standard` = the website's ordinary white card (22px radius, line border,
/// soft shadow) — the same shape course_catalogue_screen.dart's course card
/// already uses, just named and shared.
/// `hero` = the website's bigger feature-card treatment (28px radius, a
/// gradient background, a stronger shadow) used for the dashboard's hero
/// panel and, with this widget, now reusable anywhere else that needs it.
enum AppCardVariant { standard, hero }

class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.variant = AppCardVariant.standard,
    this.gradient,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final AppCardVariant variant;

  /// Hero-only. Defaults to [AppGradients.hero] when the variant is hero and
  /// none is supplied. Ignored for the standard variant (always white).
  final Gradient? gradient;

  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isHero = variant == AppCardVariant.hero;
    final radius = isHero ? 28.0 : 22.0;
    final decoration = BoxDecoration(
      color: isHero ? null : Colors.white,
      gradient: isHero ? (gradient ?? AppGradients.hero) : null,
      borderRadius: BorderRadius.circular(radius),
      border: isHero ? null : Border.all(color: AppColors.line),
      boxShadow: isHero
          ? AppGradients.softShadow(AppColors.navy900)
          : AppGradients.cardShadow,
    );

    final content = Container(
      padding: padding,
      decoration: decoration,
      child: child,
    );

    if (onTap == null) return content;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(radius),
      child: InkWell(
        borderRadius: BorderRadius.circular(radius),
        onTap: onTap,
        child: content,
      ),
    );
  }
}
