import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/search_models.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  SearchResults? _results;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    final term = value.trim();
    if (term.length < 2) {
      setState(() {
        _results = null;
        _error = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () => _search(term));
  }

  Future<void> _search(String term) async {
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.dio.get(
        '/search',
        queryParameters: {'q': term},
      );
      if (!mounted) return;
      setState(() {
        _results = SearchResults.fromJson(
          response.data['data'] as Map<String, dynamic>,
        );
        _error = null;
      });
    } catch (error) {
      if (mounted) setState(() => _error = apiErrorMessage(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          onChanged: _onChanged,
          style: const TextStyle(color: Colors.white),
          cursorColor: Colors.white,
          decoration: const InputDecoration(
            hintText: 'Search exams and courses…',
            hintStyle: TextStyle(color: Colors.white70),
            border: InputBorder.none,
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(child: Text(_error!, textAlign: TextAlign.center))
          : (_results == null)
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Type at least 2 characters to search.',
                  style: TextStyle(color: AppColors.muted),
                ),
              ),
            )
          : _results!.isEmpty
          ? const Center(
              child: Text('No results found.', style: TextStyle(color: AppColors.muted)),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_results!.exams.isNotEmpty) ...[
                  Text('Exams', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final exam in _results!.exams)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: const Icon(
                          Icons.flag_outlined,
                          color: AppColors.navy800,
                        ),
                        title: Text(exam.nameEn),
                      ),
                    ),
                  const SizedBox(height: 16),
                ],
                if (_results!.courses.isNotEmpty) ...[
                  Text('Courses', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  for (final course in _results!.courses)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: const Icon(
                          Icons.menu_book_outlined,
                          color: AppColors.navy800,
                        ),
                        title: Text(course.titleEn),
                        onTap: () => context.push('/courses/${course.id}'),
                      ),
                    ),
                ],
              ],
            ),
    );
  }
}
