import 'package:dio/dio.dart';

import '../auth/token_store.dart';

/// Points at production today — swapping this to a `--dart-define` per build
/// flavor (dev/staging/prod) is a follow-up once the app talks to more than
/// one environment; for now, this is the only backend reachable from a phone
/// that isn't on the same LAN as the dev machine.
const apiBaseUrl = 'https://api.rajyarank.com/api/v1';

/// Thin wrapper around a single shared [Dio] instance: attaches the stored
/// Bearer access token to every request, and on a 401 tries exactly one
/// refresh-then-retry before giving up and asking the caller to log in again.
class ApiClient {
  ApiClient(this._tokenStore) {
    _dio = Dio(BaseOptions(baseUrl: apiBaseUrl, connectTimeout: const Duration(seconds: 15)));
    _refreshDio = Dio(BaseOptions(baseUrl: apiBaseUrl, connectTimeout: const Duration(seconds: 15)));

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStore.readAccessToken();
          if (token != null) options.headers['Authorization'] = 'Bearer $token';
          handler.next(options);
        },
        onError: (error, handler) async {
          final isUnauthorized = error.response?.statusCode == 401;
          final alreadyRetried = error.requestOptions.extra['retried'] == true;
          if (!isUnauthorized || alreadyRetried) return handler.next(error);

          final refreshed = await _refreshOnce();
          if (!refreshed) return handler.next(error);

          try {
            final retryOptions = error.requestOptions;
            retryOptions.extra['retried'] = true;
            final token = await _tokenStore.readAccessToken();
            retryOptions.headers['Authorization'] = 'Bearer $token';
            final response = await _dio.fetch(retryOptions);
            handler.resolve(response);
          } catch (_) {
            handler.next(error);
          }
        },
      ),
    );
  }

  final TokenStore _tokenStore;
  late final Dio _dio;
  late final Dio _refreshDio;
  Future<bool>? _refreshInFlight;

  Dio get dio => _dio;

  /// Coalesces concurrent 401s into a single POST auth/refresh call — several
  /// requests failing at once shouldn't each try to rotate the refresh token.
  Future<bool> _refreshOnce() {
    return _refreshInFlight ??= _doRefresh().whenComplete(() => _refreshInFlight = null);
  }

  Future<bool> _doRefresh() async {
    final refreshToken = await _tokenStore.readRefreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await _refreshDio.post('/auth/refresh', data: {'refreshToken': refreshToken});
      final data = response.data['data'] as Map<String, dynamic>;
      await _tokenStore.save(accessToken: data['accessToken'] as String, refreshToken: data['refreshToken'] as String);
      return true;
    } catch (_) {
      await _tokenStore.clear();
      return false;
    }
  }
}
