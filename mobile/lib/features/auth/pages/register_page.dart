import 'package:flutter/material.dart';

import '../services/auth_api_service.dart';
import '../widgets/auth_text_field.dart';
import '../widgets/auth_top_brand.dart';
import '../widgets/gradient_primary_button.dart';
import 'login_page.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  static const routeName = '/register';

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  bool _acceptedTerms = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
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
                  height: 170,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
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
                              'Registro de Cliente',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 26,
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'Crea tu cuenta en CeroEspera.',
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
              const SizedBox(height: 22),
              Form(
                key: _formKey,
                child: Column(
                  children: [
                    AuthTextField(
                      label: 'NOMBRE COMPLETO',
                      hint: 'Ej. Juan Perez',
                      icon: Icons.person_outline,
                      controller: _nameCtrl,
                      validator: (v) => (v == null || v.trim().length < 3)
                          ? 'Ingresa un nombre valido'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'TELEFONO',
                      hint: '+52 000 000 0000',
                      icon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                      controller: _phoneCtrl,
                      validator: (v) => (v == null || v.trim().isEmpty)
                          ? 'Ingresa tu telefono'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    AuthTextField(
                      label: 'CORREO ELECTRONICO',
                      hint: 'juan@ejemplo.com',
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
                      hint: 'Minimo 6 caracteres',
                      icon: Icons.lock_outline,
                      obscureText: true,
                      controller: _passwordCtrl,
                      validator: (v) => (v == null || v.length < 6)
                          ? 'Minimo 6 caracteres'
                          : null,
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFC0C7D4)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Checkbox(
                            value: _acceptedTerms,
                            onChanged: (v) =>
                                setState(() => _acceptedTerms = v ?? false),
                          ),
                          const Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(top: 10),
                              child: Text(
                                'Acepto terminos y politicas de privacidad de CeroEspera.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF404752),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
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
                      label: _isSubmitting ? 'Registrando...' : 'Crear cuenta',
                      icon: _isSubmitting
                          ? Icons.hourglass_top
                          : Icons.arrow_forward,
                      onPressed: _isSubmitting ? () {} : _registrarCliente,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pushReplacementNamed(
                    context,
                    LoginPage.routeName,
                  ),
                  child: const Text('Ya tienes cuenta? Inicia sesion'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _registrarCliente() async {
    final valid = _formKey.currentState?.validate() ?? false;
    if (!valid) {
      return;
    }

    if (!_acceptedTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debes aceptar los terminos para continuar.'),
        ),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await AuthApiService.instance.registrarCliente(
        nombreCompleto: _nameCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        telefono: _phoneCtrl.text.trim(),
        contrasena: _passwordCtrl.text,
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cliente registrado correctamente.')),
      );
      Navigator.pushReplacementNamed(context, LoginPage.routeName);
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
