import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/navigation/home_shell.dart';
import '../../../core/theme/app_theme.dart';

/// A reference catalogue of every feature in the app — the mobile mirror
/// of web's authenticated `/explore` page. Unlike web, the bottom nav here
/// only has 5 slots, so features beyond those tabs (My Practice Tests, My
/// Papers, Live Classes, PYQ, Current Affairs, Doubts, Support…) have no
/// permanent nav entry — this screen is the one place a student can see
/// everything that exists and open it directly.
class AllFeaturesScreen extends ConsumerWidget {
  const AllFeaturesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    void openTab(int index) {
      ref.read(homeTabIndexProvider.notifier).state = index;
      context.go('/dashboard');
    }

    final groups = <(String, List<_Feature>)>[
      (
        'Plan your prep',
        [
          _Feature('🗺', 'Study Plan', 'Type your own topics or pick a course for a day-by-day schedule — mark tasks done or reschedule anytime.', onTap: () => openTab(3)),
          _Feature('📹', 'Live Classes', "Join your institute's scheduled live sessions.", onTap: () => context.push('/live-classes')),
        ],
      ),
      (
        'Practice & test yourself',
        [
          _Feature('📝', 'My Practice Tests', 'Type questions or bulk-paste many at once, then take your test for an instant score with explanations.', onTap: () => context.push('/my-quizzes')),
          _Feature('📄', 'My Papers', 'Upload a PDF paper you already have, answer alongside it, and get auto-scored if you add an answer key.', onTap: () => context.push('/my-papers')),
          _Feature('🕘', 'Previous Year Questions', "RajyaRank's verified library of real past exam papers.", onTap: () => context.push('/pyq')),
          _Feature('✅', 'Tests & Practice', "Mock tests published by your institute.", onTap: () => openTab(2)),
        ],
      ),
      (
        'Track progress',
        [
          _Feature('🔁', 'Revision', 'Your weak topics, surfaced automatically.', onTap: () => openTab(4)),
          _Feature('📊', 'Dashboard', 'Study streak, weekly goal, readiness score.', onTap: () => openTab(0)),
        ],
      ),
      (
        'Content',
        [
          _Feature('📰', 'Current Affairs', 'Daily updates, written for exam relevance.', onTap: () => context.push('/current-affairs')),
          _Feature('📚', 'My Courses', "Courses you've bought or received from your institute.", onTap: () => openTab(1)),
          _Feature('🛍', 'Individual Content', "Don't need a whole course? Buy just the lesson, test, or pack you actually need.", onTap: () => context.push('/content')),
        ],
      ),
      (
        'Get help',
        [
          _Feature('❓', 'My Doubts', 'Ask a question and get it answered.', onTap: () => context.push('/doubts')),
          _Feature('🎧', 'Help & Support', 'FAQs and contact options.', onTap: () => context.push('/support')),
        ],
      ),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Everything in RajyaRank')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final (title, features) in groups) ...[
            Text(title.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.muted, letterSpacing: 0.4)),
            const SizedBox(height: 8),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.35,
              children: [for (final f in features) _FeatureCard(feature: f)],
            ),
            const SizedBox(height: 20),
          ],
        ],
      ),
    );
  }
}

class _Feature {
  _Feature(this.icon, this.title, this.description, {required this.onTap});
  final String icon;
  final String title;
  final String description;
  final VoidCallback onTap;
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({required this.feature});
  final _Feature feature;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: feature.onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(feature.icon, style: const TextStyle(fontSize: 22)),
            const SizedBox(height: 6),
            Text(feature.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(height: 2),
            Expanded(
              child: Text(
                feature.description,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 10.5, color: AppColors.muted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
