import "package:local_auth/local_auth.dart";

class BiometricService {
  BiometricService({LocalAuthentication? auth}) : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  Future<bool> canUseBiometric() async {
    final available = await _auth.canCheckBiometrics;
    final supported = await _auth.isDeviceSupported();
    return available && supported;
  }

  Future<bool> authenticate() async {
    if (!await canUseBiometric()) return false;
    try {
      return await _auth.authenticate(
        localizedReason: "Authenticate to access SmartBiz Mobile",
        options: const AuthenticationOptions(stickyAuth: true, biometricOnly: false),
      );
    } catch (_) {
      return false;
    }
  }
}
