import 'package:webview_flutter/webview_flutter.dart';

/// Shared YouTube-embed navigation allowlist — originally inline in
/// lesson_player_screen.dart, extracted so the live-class join screen uses
/// the exact same security boundary rather than a second hand-copied list
/// that could silently drift out of sync. See the original comment there:
/// embeds are YouTube-only (toEmbeddableUrl in assets.service.ts), and an
/// unrestricted WebView would let a compromised embed page redirect
/// anywhere with full JS execution — indistinguishable from the real embed.
const allowedEmbedHosts = [
  'youtube.com',
  'youtube-nocookie.com',
  'googlevideo.com',
  'ytimg.com',
  'google.com',
  'gstatic.com',
];

NavigationDecision guardEmbedNavigation(NavigationRequest request) {
  final host = Uri.tryParse(request.url)?.host ?? '';
  final allowed = allowedEmbedHosts.any(
    (h) => host == h || host.endsWith('.$h'),
  );
  return allowed ? NavigationDecision.navigate : NavigationDecision.prevent;
}
