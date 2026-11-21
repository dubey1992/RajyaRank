import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/auth/auth_repository.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/embed_webview_guard.dart';
import '../data/live_class_repository.dart';

/// Same interval as the web join view's heartbeat
/// (apps/web/components/LiveClassesList.tsx) — kept in sync so "duration
/// attended" means the same thing on both platforms.
const _heartbeatInterval = Duration(seconds: 20);

/// Joins a live class — same WebView-embed pattern as the recorded-lesson
/// player's EMBED case. The join call itself (entitlement + join-window
/// check, attendance recording) already happened server-side by the time
/// this screen has a URL to load; a periodic heartbeat while this screen is
/// open then bumps that attendance row's lastSeenAt for duration tracking.
class LiveClassJoinScreen extends ConsumerStatefulWidget {
  const LiveClassJoinScreen({super.key, required this.liveClassId});

  final String liveClassId;

  @override
  ConsumerState<LiveClassJoinScreen> createState() =>
      _LiveClassJoinScreenState();
}

class _LiveClassJoinScreenState extends ConsumerState<LiveClassJoinScreen> {
  WebViewController? _controller;
  String? _error;
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    _join();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    super.dispose();
  }

  Future<void> _join() async {
    try {
      final url = await joinLiveClass(ref, widget.liveClassId);
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(onNavigationRequest: guardEmbedNavigation),
        )
        ..loadRequest(Uri.parse(url));
      if (!mounted) return;
      setState(() => _controller = controller);
      _heartbeatTimer = Timer.periodic(
        _heartbeatInterval,
        (_) => sendLiveClassHeartbeat(ref, widget.liveClassId),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = apiErrorMessage(error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: AppColors.navy900,
        title: const Text('Live class'),
      ),
      body: _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.white),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : _controller == null
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.orange500),
            )
          : WebViewWidget(controller: _controller!),
    );
  }
}
