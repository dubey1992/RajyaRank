import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/pyq_repository.dart';
import 'pyq_viewer_screen.dart';

class PyqScreen extends ConsumerWidget {
  const PyqScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final papers = ref.watch(pyqPapersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Previous Year Questions')),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(pyqPapersProvider),
        child: papers.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
            ),
          ),
          data: (list) => list.isEmpty
              ? const Center(
                  child: Text(
                    'No previous year papers available yet.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (context, i) {
                    final paper = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: const Icon(
                          Icons.picture_as_pdf_outlined,
                          color: AppColors.navy800,
                        ),
                        title: Text(paper.titleEn),
                        subtitle: Text('${paper.examNameEn} · ${paper.year}'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PyqViewerScreen(
                              paperId: paper.id,
                              title: paper.titleEn,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
