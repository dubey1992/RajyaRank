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
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Could not reach RajyaRank. Check your internet connection.';
    }
  }
  return 'Something went wrong. Please try again.';
}

/// Extracts the API error envelope's machine-readable `code` (e.g.
/// `LESSON_ENGAGEMENT_INSUFFICIENT`), for callers that need to branch on it
/// rather than just display `apiErrorMessage`.
String? apiErrorCode(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is Map) {
      final code = (data['error'] as Map)['code'];
      if (code is String) return code;
    }
  }
  return null;
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._tokenStore, this._apiClient)
    : super(const AuthState(AuthStatus.unknown)) {
    _restore();
  }

  final TokenStore _tokenStore;
  final ApiClient _apiClient;

  Future<void> _restore() async {
    final token = await _tokenStore.readRefreshToken();
    state = AuthState(
      token == null ? AuthStatus.signedOut : AuthStatus.signedIn,
    );
  }

  /// Mirrors POST auth/student/login (apps/api/src/auth/auth.controller.ts) —
  /// same credentials the web login form's "email/password" tab uses.
  Future<void> login({required String email, required String password}) async {
    final response = await _apiClient.dio.post(
      '/auth/student/login',
      data: {'email': email, 'password': password, 'remember': true},
    );
    await _signIn(response.data['data'] as Map<String, dynamic>);
  }

  /// POST auth/student/otp/request — SMS OTP, throttled 5/min server-side.
  /// Returns the OTP's TTL so the screen can drive its own countdown.
  Future<int> requestOtp(String phone) async {
    final response = await _apiClient.dio.post(
      '/auth/student/otp/request',
      data: {'phone': phone},
    );
    return (response.data['data']['expiresInSeconds'] as num).toInt();
  }

  /// POST auth/student/otp/verify — creates the account on first login, same
  /// as the (currently web-hidden, but fully functional) phone tab.
  Future<void> verifyOtp({
    required String phone,
    required String code,
    String? referralCode,
  }) async {
    final response = await _apiClient.dio.post(
      '/auth/student/otp/verify',
      data: {
        'phone': phone,
        'code': code,
        if (referralCode != null) 'referralCode': referralCode,
      },
    );
    await _signIn(response.data['data'] as Map<String, dynamic>);
  }

  /// POST auth/student/signup/request — sends a 6-digit email verification code.
  Future<void> requestSignup(String email) async {
    await _apiClient.dio.post(
      '/auth/student/signup/request',
      data: {'email': email},
    );
  }

  /// POST auth/student/signup/verify — creates the account and signs in.
  Future<void> verifySignup({
    required String email,
    required String code,
    required String password,
    String? referralCode,
  }) async {
    final response = await _apiClient.dio.post(
      '/auth/student/signup/verify',
      data: {
        'email': email,
        'code': code,
        'password': password,
        if (referralCode != null) 'referralCode': referralCode,
      },
    );
    await _signIn(response.data['data'] as Map<String, dynamic>);
  }

  /// POST auth/student/password/forgot — always succeeds server-side (doesn't
  /// reveal whether the email exists), so there's nothing to branch on here.
  Future<void> forgotPassword(String email) async {
    await _apiClient.dio.post(
      '/auth/student/password/forgot',
      data: {'email': email},
    );
  }

  /// POST auth/student/password/reset — takes the 6-digit code emailed by
  /// [forgotPassword] plus a new password. Revokes all sessions/trusted
  /// devices server-side, so this does NOT sign the caller in; matches web's
  /// `studentPasswordResetSchema` (email/code/password).
  Future<void> resetPassword({
    required String email,
    required String code,
    required String password,
  }) async {
    await _apiClient.dio.post(
      '/auth/student/password/reset',
      data: {'email': email, 'code': code, 'password': password},
    );
  }

  Future<void> _signIn(Map<String, dynamic> data) async {
    await _tokenStore.save(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
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

final tokenStoreProvider = Provider(
  (ref) => TokenStore(ref.watch(secureStorageProvider)),
);

final apiClientProvider = Provider(
  (ref) => ApiClient(ref.watch(tokenStoreProvider)),
);

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) {
    return AuthController(
      ref.watch(tokenStoreProvider),
      ref.watch(apiClientProvider),
    );
  },
);
