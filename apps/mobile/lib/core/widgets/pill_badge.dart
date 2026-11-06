import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// The website's "eyebrow" pill badge — rounded-full, a tinted border +
/// background, bold small text. Generalizes the inline pattern already used
/// in course_catalogue_screen.dart so every screen can share one definition.
enum PillTone { teal, orange, navy, muted }

class PillBadge extends StatelessWidget {
  const PillBadge({
    super.key,
    required this.label,
    this.tone = PillTone.teal,
    this.icon,
  });

  final String label;
  final PillTone tone;
  final IconData? icon;

  (Color border, Color bg, Color text) _colors() {
    switch (tone) {
      case PillTone.teal:
        return (
          AppColors.teal500.withValues(alpha: 0.4),
          AppColors.teal100,
          AppColors.teal600,
        );
      case PillTone.orange:
        return (
          AppColors.orange500.withValues(alpha: 0.4),
          AppColors.orange100,
          AppColors.orange600,
        );
      case PillTone.navy:
        return (
          AppColors.navy900.withValues(alpha: 0.2),
          AppColors.navy100,
          AppColors.navy900,
        );
      case PillTone.muted:
        return (AppColors.line, AppColors.surfaceSoft, AppColors.muted);
    }
  }

  @override
  Widget build(BuildContext context) {
    final (border, bg, text) = _colors();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: text),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: text,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
