import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';

/// Phone-OTP login — hidden behind a feature flag on the web app today
/// (`SHOW_STUDENT_PHONE_LOGIN = false`) but fully implemented server-side;
/// surfaced here since OTP is the more natural default on mobile.
class OtpLoginTab extends ConsumerStatefulWidget {
  const OtpLoginTab({super.key});

  @override
  ConsumerState<OtpLoginTab> createState() => _OtpLoginTabState();
}

class _OtpLoginTabState extends ConsumerState<OtpLoginTab> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  bool _codeSent = false;
  bool _submitting = false;
  String? _error;
  Timer? _timer;
  int _secondsLeft = 0;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startCountdown(int seconds) {
    _timer?.cancel();
    setState(() => _secondsLeft = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft <= 1) {
        t.cancel();
        setState(() => _secondsLeft = 0);
      } else {
        setState(() => _secondsLeft--);
      }
    });
  }

  Future<void> _sendCode() async {
    final phone = _phoneController.text.trim();
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(phone)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final expiresIn = await ref
          .read(authControllerProvider.notifier)
          .requestOtp(phone);
      HapticFeedback.lightImpact();
      setState(() => _codeSent = true);
      _startCountdown(expiresIn);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _verify() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit code');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .verifyOtp(phone: _phoneController.text.trim(), code: code);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: _codeSent
              ? _CodeStep(
                  key: const ValueKey('code'),
                  phone: _phoneController.text.trim(),
                  codeController: _codeController,
                  secondsLeft: _secondsLeft,
                  onResend: _secondsLeft == 0 ? _sendCode : null,
                  onEditNumber: () => setState(() {
                    _codeSent = false;
                    _codeController.clear();
                    _timer?.cancel();
                  }),
                )
              : _PhoneStep(
                  key: const ValueKey('phone'),
                  controller: _phoneController,
                  onSubmit: _sendCode,
                ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.danger.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              _error!,
              style: const TextStyle(color: AppColors.danger),
            ),
          ),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _submitting ? null : (_codeSent ? _verify : _sendCode),
          child: _submitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    color: Colors.white,
                  ),
                )
              : Text(_codeSent ? 'Verify & continue' : 'Send OTP'),
        ),
      ],
    );
  }
}

class _PhoneStep extends StatelessWidget {
  const _PhoneStep({
    super.key,
    required this.controller,
    required this.onSubmit,
  });
  final TextEditingController controller;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.phone,
      maxLength: 10,
      decoration: const InputDecoration(
        labelText: 'Mobile number',
        prefixText: '+91  ',
        counterText: '',
      ),
      onSubmitted: (_) => onSubmit(),
    );
  }
}

class _CodeStep extends StatelessWidget {
  const _CodeStep({
    super.key,
    required this.phone,
    required this.codeController,
    required this.secondsLeft,
    required this.onResend,
    required this.onEditNumber,
  });

  final String phone;
  final TextEditingController codeController;
  final int secondsLeft;
  final VoidCallback? onResend;
  final VoidCallback onEditNumber;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Code sent to +91 $phone',
                style: const TextStyle(color: AppColors.muted),
              ),
            ),
            TextButton(onPressed: onEditNumber, child: const Text('Edit')),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: codeController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 22,
            letterSpacing: 8,
            fontWeight: FontWeight.w700,
          ),
          decoration: const InputDecoration(counterText: ''),
        ),
        const SizedBox(height: 4),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: onResend,
            child: Text(
              secondsLeft > 0 ? 'Resend in ${secondsLeft}s' : 'Resend code',
            ),
          ),
        ),
      ],
    );
  }
}
