/// Mirrors `PASSWORD_RULES`/`passwordSchema` in packages/contracts/src/common.ts
/// exactly, so client-side validation never disagrees with what the server
/// will accept.
class PasswordRule {
  const PasswordRule({required this.id, required this.label, required this.test});

  final String id;
  final String label;
  final bool Function(String value) test;
}

final passwordRules = <PasswordRule>[
  PasswordRule(
    id: 'length',
    label: 'At least 10 characters',
    test: (v) => v.length >= 10,
  ),
  PasswordRule(
    id: 'upper',
    label: 'One uppercase letter',
    test: (v) => RegExp(r'[A-Z]').hasMatch(v),
  ),
  PasswordRule(
    id: 'lower',
    label: 'One lowercase letter',
    test: (v) => RegExp(r'[a-z]').hasMatch(v),
  ),
  PasswordRule(
    id: 'digit',
    label: 'One number',
    test: (v) => RegExp(r'[0-9]').hasMatch(v),
  ),
  PasswordRule(
    id: 'special',
    label: 'One special character',
    test: (v) => RegExp(r'[^a-zA-Z0-9]').hasMatch(v),
  ),
];

bool isValidPassword(String value) =>
    value.length <= 128 && passwordRules.every((rule) => rule.test(value));
