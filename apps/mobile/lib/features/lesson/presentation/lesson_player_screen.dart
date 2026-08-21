import 'dart:async';
import 'dart:typed_data';

import 'package:chewie/chewie.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfx/pdfx.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../data/lesson_models.dart';
import '../data/lesson_repository.dart';

const _heartbeatInterval = Duration(seconds: 20);

class LessonPlayerScreen extends ConsumerStatefulWidget {
  const LessonPlayerScreen({super.key, required this.lessonId});

  final String lessonId;

  @override
  ConsumerState<LessonPlayerScreen> createState() =>
      _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen> {
  PlaybackToken? _token;
  bool _loadingToken = false;
  String? _loadError;

  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  WebViewController? _webViewController;
  PdfController? _pdfController;
  bool _videoStarted = false;

  int _positionSeconds = 0;
  int _percentComplete = 0;
  bool _bookmarked = false;
  bool _completed = false;
  bool _completing = false;
  Timer? _heartbeatTimer;

  LessonRepository get _repo => ref.read(lessonRepositoryProvider);

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    _chewieController?.dispose();
    _videoController?.dispose();
    _pdfController?.dispose();
    super.dispose();
  }

  void _primeFrom(LessonDetail lesson) {
    _positionSeconds = lesson.progress?.videoPositionSeconds ?? 0;
    _percentComplete = lesson.progress?.percentComplete ?? 0;
    _bookmarked = lesson.bookmarked;
    _completed = lesson.progress?.status == 'COMPLETED';
  }

  Future<void> _load() async {
    setState(() {
      _loadingToken = true;
      _loadError = null;
    });
    try {
      final token = await _repo.requestPlaybackToken(widget.lessonId);
      switch (token.kind) {
        case PlaybackKind.video:
          final controller = VideoPlayerController.networkUrl(
            Uri.parse(token.url),
          );
          await controller.initialize();
          controller.addListener(_onVideoTick);
          _videoController = controller;
          _chewieController = ChewieController(
            videoPlayerController: controller,
            autoPlay: false,
            looping: false,
            aspectRatio: controller.value.aspectRatio == 0
                ? 16 / 9
                : controller.value.aspectRatio,
          );
        case PlaybackKind.embed:
          _webViewController = WebViewController()
            ..setJavaScriptMode(JavaScriptMode.unrestricted)
            ..setNavigationDelegate(
              NavigationDelegate(onNavigationRequest: _guardEmbedNavigation),
            )
            ..loadRequest(Uri.parse(token.url));
          unawaited(_markStarted());
        case PlaybackKind.document:
          final bytes = await _downloadPdf(token.url);
          _pdfController = PdfController(
            document: PdfDocument.openData(bytes),
          );
          unawaited(_markStarted());
      }
      if (!mounted) return;
      setState(() {
        _token = token;
        _loadingToken = false;
      });
      _heartbeatTimer = Timer.periodic(
        _heartbeatInterval,
        (_) => _heartbeatTick(),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loadError = apiErrorMessage(error);
        _loadingToken = false;
      });
    }
  }

  /// Embed lessons are YouTube-only today (see `toEmbeddableUrl` in
  /// assets.service.ts) but the WebView had no navigation restriction at
  /// all — a compromised admin account, a malicious lesson entry, or a
  /// compromised embed page could otherwise redirect it anywhere with full
  /// JS execution, indistinguishable from the real embed (phishing risk).
  /// Allows YouTube's own related domains (needed for the player itself to
  /// work — video segments, thumbnails, consent redirects) and blocks
  /// everything else as a top-level navigation.
  static const _allowedEmbedHosts = [
    'youtube.com',
    'youtube-nocookie.com',
    'googlevideo.com',
    'ytimg.com',
    'google.com',
    'gstatic.com',
  ];

  NavigationDecision _guardEmbedNavigation(NavigationRequest request) {
    final host = Uri.tryParse(request.url)?.host ?? '';
    final allowed = _allowedEmbedHosts.any(
      (h) => host == h || host.endsWith('.$h'),
    );
    return allowed ? NavigationDecision.navigate : NavigationDecision.prevent;
  }

  Future<Uint8List> _downloadPdf(String url) async {
    final response = await Dio().get<List<int>>(
      url,
      options: Options(responseType: ResponseType.bytes),
    );
    return Uint8List.fromList(response.data ?? const []);
  }

  /// The click-to-load itself is the only "started" signal a non-video
  /// (embed/PDF) lesson gives — there's no play/pause event to hook.
  Future<void> _markStarted() async {
    if (_completed) return;
    final percent = _percentComplete > 5 ? _percentComplete : 5;
    try {
      await _repo.updateProgress(
        widget.lessonId,
        status: 'IN_PROGRESS',
        percentComplete: percent,
      );
      if (mounted) setState(() => _percentComplete = percent);
    } catch (_) {
      // Heartbeats are best-effort.
    }
  }

  void _onVideoTick() {
    final controller = _videoController;
    if (controller == null || _videoStarted) return;
    if (controller.value.isPlaying) {
      _videoStarted = true;
      unawaited(_markStarted());
    }
  }

  Future<void> _heartbeatTick() async {
    if (_token == null) return;
    try {
      if (_token!.kind == PlaybackKind.video) {
        final controller = _videoController;
        if (controller == null ||
            !controller.value.isInitialized ||
            !controller.value.isPlaying) {
          return;
        }
        final position = controller.value.position.inSeconds;
        final durationSeconds = controller.value.duration.inSeconds;
        final percent = durationSeconds > 0
            ? ((position / durationSeconds) * 100).round().clamp(0, 99)
            : _percentComplete;
        _positionSeconds = position;
        final nextPercent = _completed
            ? _percentComplete
            : (percent > _percentComplete ? percent : _percentComplete);
        await _repo.updateProgress(
          widget.lessonId,
          status: _completed ? null : 'IN_PROGRESS',
          percentComplete: _completed ? null : nextPercent,
          videoPositionSeconds: _positionSeconds,
        );
        if (mounted) setState(() => _percentComplete = nextPercent);
      } else {
        _positionSeconds += _heartbeatInterval.inSeconds;
        await _repo.updateProgress(
          widget.lessonId,
          videoPositionSeconds: _positionSeconds,
        );
      }
    } catch (_) {
      // Heartbeats are best-effort — a dropped tick just means slightly
      // stale progress until the next one succeeds.
    }
  }

  Future<void> _markComplete() async {
    setState(() => _completing = true);
    try {
      await _repo.updateProgress(
        widget.lessonId,
        status: 'COMPLETED',
        percentComplete: 100,
        videoPositionSeconds: _positionSeconds,
      );
      if (!mounted) return;
      setState(() {
        _completed = true;
        _percentComplete = 100;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lesson marked complete')));
    } catch (error) {
      final code = apiErrorCode(error);
      final message = code == 'LESSON_ENGAGEMENT_INSUFFICIENT'
          ? "Spend a little more time on this lesson before marking it complete."
          : apiErrorMessage(error);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  Future<void> _toggleBookmark() async {
    final previous = _bookmarked;
    setState(() => _bookmarked = !_bookmarked);
    try {
      final result = await _repo.toggleBookmark(widget.lessonId);
      if (mounted) setState(() => _bookmarked = result);
    } catch (_) {
      if (mounted) setState(() => _bookmarked = previous);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lessonAsync = ref.watch(lessonDetailProvider(widget.lessonId));

    return Scaffold(
      appBar: AppBar(
        title: Text(
          lessonAsync.maybeWhen(
            data: (l) => l.titleEn,
            orElse: () => 'Lesson',
          ),
        ),
        actions: [
          if (lessonAsync.hasValue)
            IconButton(
              icon: Icon(_bookmarked ? Icons.bookmark : Icons.bookmark_border),
              onPressed: _toggleBookmark,
            ),
        ],
      ),
      body: lessonAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(error), textAlign: TextAlign.center),
          ),
        ),
        data: (lesson) {
          if (!lesson.accessible) {
            return const _LockedState();
          }
          if (_positionSeconds == 0 && _percentComplete == 0 && _token == null) {
            _primeFrom(lesson);
          }
          return ListView(
            padding: EdgeInsets.zero,
            children: [
              _PlayerArea(
                lesson: lesson,
                token: _token,
                loading: _loadingToken,
                error: _loadError,
                onLoad: _load,
                chewieController: _chewieController,
                webViewController: _webViewController,
                pdfController: _pdfController,
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (lesson.summaryEn != null &&
                        lesson.summaryEn!.isNotEmpty) ...[
                      Text(
                        lesson.summaryEn!,
                        style: const TextStyle(color: AppColors.muted),
                      ),
                      const SizedBox(height: 16),
                    ],
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: _percentComplete / 100,
                        minHeight: 8,
                        backgroundColor: AppColors.line,
                        color: _completed
                            ? AppColors.success
                            : AppColors.teal500,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _completed ? 'Completed' : '$_percentComplete% watched',
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: (_completed || _completing || _token == null)
                          ? null
                          : _markComplete,
                      child: _completing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              _completed ? 'Completed ✓' : 'Mark as complete',
                            ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _LockedState extends StatelessWidget {
  const _LockedState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline, size: 40, color: AppColors.muted),
            const SizedBox(height: 12),
            const Text(
              "This lesson isn't included in your current plan.",
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _PlayerArea extends StatelessWidget {
  const _PlayerArea({
    required this.lesson,
    required this.token,
    required this.loading,
    required this.error,
    required this.onLoad,
    required this.chewieController,
    required this.webViewController,
    required this.pdfController,
  });

  final LessonDetail lesson;
  final PlaybackToken? token;
  final bool loading;
  final String? error;
  final VoidCallback onLoad;
  final ChewieController? chewieController;
  final WebViewController? webViewController;
  final PdfController? pdfController;

  @override
  Widget build(BuildContext context) {
    if (token == null) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          color: AppColors.navy950,
          child: Center(
            child: loading
                ? const CircularProgressIndicator(color: Colors.white)
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        lesson.isDocumentType
                            ? Icons.picture_as_pdf_outlined
                            : Icons.play_circle_outline,
                        color: Colors.white,
                        size: 56,
                      ),
                      const SizedBox(height: 12),
                      if (error != null) ...[
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            error!,
                            style: const TextStyle(color: Colors.white70),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      ElevatedButton(
                        onPressed: onLoad,
                        child: Text(error != null ? 'Retry' : 'Load lesson'),
                      ),
                    ],
                  ),
          ),
        ),
      );
    }

    return switch (token!.kind) {
      PlaybackKind.video => AspectRatio(
        aspectRatio: chewieController?.aspectRatio ?? 16 / 9,
        child: chewieController != null
            ? Chewie(controller: chewieController!)
            : const ColoredBox(color: Colors.black),
      ),
      PlaybackKind.embed => AspectRatio(
        aspectRatio: 16 / 9,
        child: webViewController != null
            ? WebViewWidget(controller: webViewController!)
            : const ColoredBox(color: Colors.black),
      ),
      PlaybackKind.document => SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: pdfController != null
            ? PdfView(controller: pdfController!)
            : const ColoredBox(color: Colors.black),
      ),
    };
  }
}
