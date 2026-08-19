import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/confirm_logout.dart';
import '../../onboarding/data/onboarding_repository.dart';
import '../data/account_models.dart';
import '../data/account_repository.dart';
import 'change_password_screen.dart';
import 'edit_profile_screen.dart';
import 'study_goals_screen.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
          ),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      (data.fullName?.isNotEmpty ?? false)
                          ? data.fullName!
                          : (data.displayName ?? 'Student'),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    if (data.email != null) ...[
                      const SizedBox(height: 4),
                      Text(data.email!, style: const TextStyle(color: AppColors.muted)),
                    ],
                    if (data.phone != null) ...[
                      const SizedBox(height: 2),
                      Text(data.phone!, style: const TextStyle(color: AppColors.muted)),
                    ],
                    const SizedBox(height: 10),
                    OutlinedButton(
                      onPressed: () async {
                        final saved = await Navigator.of(context).push<bool>(
                          MaterialPageRoute(
                            builder: (_) => EditProfileScreen(profile: data),
                          ),
                        );
                        if (saved == true) ref.invalidate(profileProvider);
                      },
                      child: const Text('Edit profile'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            _InstitutionCard(profile: data),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                title: const Text('Study goals'),
                subtitle: const Text('Target exam, qualification, daily time'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () async {
                  final goals = await ref.read(studyGoalsProvider.future);
                  if (!context.mounted) return;
                  final saved = await Navigator.of(context).push<bool>(
                    MaterialPageRoute(
                      builder: (_) => StudyGoalsScreen(goals: goals),
                    ),
                  );
                  if (saved == true) ref.invalidate(studyGoalsProvider);
                },
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.receipt_long_outlined),
                    title: const Text('Order history'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/account/orders'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.credit_card_outlined),
                    title: const Text('Saved cards'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/account/cards'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.workspace_premium_outlined),
                    title: const Text('Plans & courses'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/pricing'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.history_edu_outlined),
                    title: const Text('Previous Year Questions'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/pyq'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.help_outline),
                    title: const Text('Doubts'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/doubts'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.newspaper_outlined),
                    title: const Text('Current Affairs'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/current-affairs'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.favorite_border),
                    title: const Text('Wishlist'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/wishlist'),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.support_agent_outlined),
                    title: const Text('Support'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/support'),
                  ),
                ],
              ),
            ),
            if (data.hasPassword) ...[
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.lock_outline),
                  title: const Text('Change password'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ChangePasswordScreen(),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => confirmLogout(context, ref),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
              child: const Text('Sign out'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InstitutionCard extends ConsumerStatefulWidget {
  const _InstitutionCard({required this.profile});
  final ProfileData profile;

  @override
  ConsumerState<_InstitutionCard> createState() => _InstitutionCardState();
}

class _InstitutionCardState extends ConsumerState<_InstitutionCard> {
  final _codeController = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(onboardingRepositoryProvider).joinInstitution(code);
      ref.invalidate(profileProvider);
    } catch (error) {
      setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave institution'),
        content: Text(
          'Leave ${widget.profile.institution?.name ?? 'this institution'}? '
          "You'll lose access to any institute-only courses.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(accountRepositoryProvider).leaveInstitution();
      ref.invalidate(profileProvider);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(apiErrorMessage(error))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final institution = widget.profile.institution;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: institution != null
            ? Row(
                children: [
                  const Icon(Icons.apartment, color: AppColors.navy800),
                  const SizedBox(width: 10),
                  Expanded(child: Text(institution.name)),
                  _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : TextButton(onPressed: _leave, child: const Text('Leave')),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Joining through an institute?',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _codeController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: const InputDecoration(
                            labelText: 'Access code',
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        onPressed: _busy ? null : _join,
                        child: _busy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Join'),
                      ),
                    ],
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  ],
                ],
              ),
      ),
    );
  }
}
