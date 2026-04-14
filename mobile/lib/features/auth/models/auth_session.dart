import 'cliente_model.dart';

class AuthSession {
  const AuthSession({
    required this.tokenAcceso,
    required this.tipoToken,
    required this.cliente,
  });

  final String tokenAcceso;
  final String tipoToken;
  final ClienteModel cliente;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      tokenAcceso: json['token_acceso'] as String,
      tipoToken: json['tipo_token'] as String,
      cliente: ClienteModel.fromJson(json['cliente'] as Map<String, dynamic>),
    );
  }
}
