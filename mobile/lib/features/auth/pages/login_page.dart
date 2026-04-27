import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../dashboard/pages/client_dashboard_page.dart';
import '../services/auth_api_service.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/auth_top_brand.dart';
import '../widgets/gradient_primary_button.dart';
import '../../../services/notification_service.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  static const routeName = '/login';

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  bool _hidePass = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const AuthTopBrand(),
              const SizedBox(height: 18),
              ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: SizedBox(
                  height: 190,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80',
                        fit: BoxFit.cover,
                      ),
                      Container(color: const Color(0x8A005EA4)),
                      const Padding(
                        padding: EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              'Bienvenido de nuevo',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 30,
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'Inicia sesion para continuar en CeroEspera.',
                              style: TextStyle(
                                color: Color(0xFFE3EEFB),
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    AuthTextField(
                      label: 'CORREO ELECTRONICO',
                      hint: 'nombre@ejemplo.com',
                      icon: Icons.mail_outline,
                      keyboardType: TextInputType.emailAddress,
                      controller: _emailCtrl,
                      validator: (v) => (v == null || !v.contains('@'))
                          ? 'Correo invalido'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'CONTRASENA',
                      hint: '••••••••',
                      icon: Icons.lock_outline,
                      obscureText: _hidePass,
                      controller: _passwordCtrl,
                      validator: (v) => (v == null || v.length < 6)
                          ? 'Contrasena invalida'
                          : null,
                      suffix: IconButton(
                        onPressed: () => setState(() => _hidePass = !_hidePass),
                        icon: Icon(
                          _hidePass
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {},
                        child: const Text('Olvidaste tu contrasena?'),
                      ),
                    ),
                    if (_errorMessage != null) ...[
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFEBEA),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFF1B8B5)),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: Color(0xFF93000A),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                    GradientPrimaryButton(
                      label: _isSubmitting ? 'Iniciando...' : 'Iniciar Sesion',
                      icon: _isSubmitting
                          ? Icons.hourglass_top
                          : Icons.arrow_forward,
                      onPressed: _isSubmitting ? () {} : _iniciarSesion,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: const [
                  Expanded(child: Divider()),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Text(
                      'O continua con',
                      style: TextStyle(fontSize: 12, color: Color(0xFF707783)),
                    ),
                  ),
                  Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.g_mobiledata, size: 26),
                      label: const Text('Google'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.facebook),
                      label: const Text('Facebook'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pushReplacementNamed(
                    context,
                    RegisterPage.routeName,
                  ),
                  child: const Text('No tienes cuenta? Registrate ahora'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _iniciarSesion() async {
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) {
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final session = await AuthApiService.instance.iniciarSesion(
        email: _emailCtrl.text.trim(),
        contrasena: _passwordCtrl.text,
      );

      if (!mounted) {
        return;
      }

      // Guardar el ID del cliente en SharedPreferences para el token FCM
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('cliente_id', session.cliente.id);
      print('✅ Cliente ID guardado: ${session.cliente.id}');

      // Enviar el token FCM pendiente al backend
      await NotificationService.enviarTokenPendiente();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Sesion iniciada. Bienvenido ${session.cliente.nombreCompleto}',
          ),
        ),
      );
      Navigator.pushReplacementNamed(context, ClientDashboardPage.routeName);
    } on AuthApiException catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'No se pudo conectar con el backend.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}
