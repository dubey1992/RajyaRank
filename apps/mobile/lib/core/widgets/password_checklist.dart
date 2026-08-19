import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../validation/password_rules.dart';

/// Live pass/fail list under a new-password field — mirrors web's
/// `<PasswordChecklist>` component so students see the same rules in the
/// same order on both platforms.
class PasswordChecklist extends StatelessWidget {
  const PasswordChecklist({super.key, required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 14,
      runSpacing: 6,
      children: [
        for (final rule in passwordRules)
          _RuleRow(label: rule.label, met: rule.test(password)),
      ],
    );
  }
}

class _RuleRow extends StatelessWidget {
  const _RuleRow({required this.label, required this.met});

  final String label;
  final bool met;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          met ? Icons.check_circle : Icons.circle_outlined,
          size: 15,
          color: met ? AppColors.success : AppColors.muted,
        ),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: met ? AppColors.success : AppColors.muted,
          ),
        ),
      ],
    );
  }
}
