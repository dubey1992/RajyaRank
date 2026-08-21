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

  /// Some Android devices (seen on MIUI) can hang — not throw, hang —
  /// on the very first Keystore-backed read/write after a fresh install,
  /// since flutter_secure_storage lazily creates the underlying
  /// EncryptedSharedPreferences key on first touch. With no timeout, that
  /// stall left [AuthController._restore] awaiting forever, so the app
  /// never got past its initial loading state — reported as "stuck on the
  /// splash screen" and reproducing after every relaunch, since the
  /// underlying device-side condition isn't transient. Treating a stall as
  /// "no value" is always safe here: worst case is an extra login prompt,
  /// never silent data loss.
  static const _timeout = Duration(seconds: 5);

  Future<void> save({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _storage.write(key: _accessKey, value: accessToken).timeout(_timeout);
    await _storage.write(key: _refreshKey, value: refreshToken).timeout(_timeout);
  }

  Future<String?> readAccessToken() =>
      _storage.read(key: _accessKey).timeout(_timeout, onTimeout: () => null);
  Future<String?> readRefreshToken() =>
      _storage.read(key: _refreshKey).timeout(_timeout, onTimeout: () => null);

  Future<void> clear() async {
    await _storage.delete(key: _accessKey).timeout(_timeout, onTimeout: () {});
    await _storage.delete(key: _refreshKey).timeout(_timeout, onTimeout: () {});
  }
}
