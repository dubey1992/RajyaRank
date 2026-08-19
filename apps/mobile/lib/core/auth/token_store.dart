import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Holds the access/refresh tokens the API now returns in the login/signup/
/// refresh response body specifically for Bearer-only clients (see
/// apps/api/src/auth/auth.service.ts `issue()`) — the web app ignores these
/// fields and keeps using its httpOnly cookies instead.
class TokenStore {
  TokenStore(this._storage);

  final FlutterSecureStorage _storage;

  static const _accessKey = 'rr_access_token';
  static const _refreshKey = 'rr_refresh_token';

  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<String?> readAccessToken() => _storage.read(key: _accessKey);
  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
