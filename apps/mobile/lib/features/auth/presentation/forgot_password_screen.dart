import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/validation/password_rules.dart';
import '../../../core/widgets/password_checklist.dart';

enum _Step { request, reset, done }

/// Mirrors apps/web/app/[locale]/forgot-password/page.tsx: a single screen,
/// no emailed link/token — step 1 requests a 6-digit code by email, step 2
/// takes that code plus a new password in-app.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  _Step _step = _Step.request;
  bool _submitting = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _requestCode() async {
    final email = _emailController.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(email)) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).forgotPassword(email);
      if (mounted) setState(() => _step = _Step.reset);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _reset() async {
    final code = _codeController.text.trim();
    final password = _passwordController.text;
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code from your email.');
      return;
    }
    if (!isValidPassword(password)) {
      setState(() => _error = 'Password does not meet all requirements.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .resetPassword(
            email: _emailController.text.trim(),
            code: code,
            password: password,
          );
      if (mounted) setState(() => _step = _Step.done);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.ink,
        elevation: 0,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: switch (_step) {
                _Step.request => _RequestStep(
                  emailController: _emailController,
                  submitting: _submitting,
                  error: _error,
                  onSubmit: _requestCode,
                ),
                _Step.reset => _ResetStep(
                  email: _emailController.text.trim(),
                  codeController: _codeController,
                  passwordController: _passwordController,
                  obscure: _obscure,
                  onToggleObscure: () =>
                      setState(() => _obscure = !_obscure),
                  submitting: _submitting,
                  error: _error,
                  onSubmit: _reset,
                ),
                _Step.done => _DoneStep(onGoToLogin: () => context.go('/login')),
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _RequestStep extends StatelessWidget {
  const _RequestStep({
    required this.emailController,
    required this.submitting,
    required this.error,
    required this.onSubmit,
  });

  final TextEditingController emailController;
  final bool submitting;
  final String? error;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Reset your password',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        const Text(
          "Enter the email on your account and we'll send you a verification code.",
          style: TextStyle(color: AppColors.muted),
        ),
        const SizedBox(height: 22),
        TextField(
          controller: emailController,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          decoration: const InputDecoration(labelText: 'Email'),
          onSubmitted: (_) => onSubmit(),
        ),
        if (error != null) ...[
          const SizedBox(height: 14),
          _ErrorBanner(message: error!),
        ],
        const SizedBox(height: 22),
        ElevatedButton(
          onPressed: submitting ? null : onSubmit,
          child: submitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: Colors.white,
                  ),
                )
              : const Text('Send code'),
        ),
      ],
    );
  }
}

class _ResetStep extends StatefulWidget {
  const _ResetStep({
    required this.email,
    required this.codeController,
    required this.passwordController,
    required this.obscure,
    required this.onToggleObscure,
    required this.submitting,
    required this.error,
    required this.onSubmit,
  });

  final String email;
  final TextEditingController codeController;
  final TextEditingController passwordController;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final bool submitting;
  final String? error;
  final VoidCallback onSubmit;

  @override
  State<_ResetStep> createState() => _ResetStepState();
}

class _ResetStepState extends State<_ResetStep> {
  @override
  void initState() {
    super.initState();
    widget.passwordController.addListener(_onPasswordChanged);
  }

  @override
  void dispose() {
    widget.passwordController.removeListener(_onPasswordChanged);
    super.dispose();
  }

  void _onPasswordChanged() => setState(() {});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Enter your code',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        Text(
          'If that email exists, a code has been sent to ${widget.email}. '
          'Enter the code and a new password below.',
          style: const TextStyle(color: AppColors.muted),
        ),
        const SizedBox(height: 22),
        TextField(
          controller: widget.codeController,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(
            fontSize: 22,
            letterSpacing: 8,
            fontWeight: FontWeight.w700,
          ),
          decoration: const InputDecoration(
            labelText: 'Verification code',
            counterText: '',
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: widget.passwordController,
          obscureText: widget.obscure,
          autofillHints: const [AutofillHints.newPassword],
          decoration: InputDecoration(
            labelText: 'New password',
            suffixIcon: IconButton(
              icon: Icon(
                widget.obscure
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
              onPressed: widget.onToggleObscure,
            ),
          ),
          onSubmitted: (_) => widget.onSubmit(),
        ),
        const SizedBox(height: 10),
        PasswordChecklist(password: widget.passwordController.text),
        if (widget.error != null) ...[
          const SizedBox(height: 14),
          _ErrorBanner(message: widget.error!),
        ],
        const SizedBox(height: 22),
        ElevatedButton(
          onPressed: widget.submitting ? null : widget.onSubmit,
          child: widget.submitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: Colors.white,
                  ),
                )
              : const Text('Reset password'),
        ),
      ],
    );
  }
}

class _DoneStep extends StatelessWidget {
  const _DoneStep({required this.onGoToLogin});

  final VoidCallback onGoToLogin;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(
          Icons.check_circle_outline,
          size: 44,
          color: AppColors.success,
        ),
        const SizedBox(height: 16),
        Text(
          'Password reset',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        const Text(
          'Your password has been reset. You can now sign in with your new password.',
          style: TextStyle(color: AppColors.muted),
        ),
        const SizedBox(height: 22),
        ElevatedButton(onPressed: onGoToLogin, child: const Text('Go to login')),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(message, style: const TextStyle(color: AppColors.danger)),
    );
  }
}
