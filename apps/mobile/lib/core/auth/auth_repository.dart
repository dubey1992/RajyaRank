import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import 'token_store.dart';

enum AuthStatus { unknown, signedOut, signedIn }

class AuthState {
  const AuthState(this.status);
  final AuthStatus status;
}

/// Extracts the API's standard error envelope (`{ error: { message, code } }`,
/// see apps/api/src/common/filters/all-exceptions.filter.ts) so screens can
/// show the same human-facing message the web app would.
String apiErrorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is Map) {
      final message = (data['error'] as Map)['message'];
      if (message is String && message.isNotEmpty) return message;
    }
    if (error.type == DioExceptionType.connectionTimeout || error.type == DioExceptionType.connectionError) {
      return 'Could not reach RajyaRank. Check your internet connection.';
    }
  }
  return 'Something went wrong. Please try again.';
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._tokenStore, this._apiClient) : super(const AuthState(AuthStatus.unknown)) {
    _restore();
  }

  final TokenStore _tokenStore;
  final ApiClient _apiClient;

  Future<void> _restore() async {
    final token = await _tokenStore.readRefreshToken();
    state = AuthState(token == null ? AuthStatus.signedOut : AuthStatus.signedIn);
  }

  /// Mirrors POST auth/student/login (apps/api/src/auth/auth.controller.ts) —
  /// same credentials the web login form's "email/password" tab uses.
  Future<void> login({required String email, required String password}) async {
    final response = await _apiClient.dio.post('/auth/student/login', data: {
      'email': email,
      'password': password,
      'remember': true,
    });
    final data = response.data['data'] as Map<String, dynamic>;
    await _tokenStore.save(accessToken: data['accessToken'] as String, refreshToken: data['refreshToken'] as String);
    state = const AuthState(AuthStatus.signedIn);
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post('/auth/logout');
    } catch (_) {
      // Best-effort server-side revoke — clearing local tokens below is what
      // actually signs the device out even if this call fails offline.
    }
    await _tokenStore.clear();
    state = const AuthState(AuthStatus.signedOut);
  }
}

final secureStorageProvider = Provider((ref) => const FlutterSecureStorage());

final tokenStoreProvider = Provider((ref) => TokenStore(ref.watch(secureStorageProvider)));

final apiClientProvider = Provider((ref) => ApiClient(ref.watch(tokenStoreProvider)));

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(tokenStoreProvider), ref.watch(apiClientProvider));
});
