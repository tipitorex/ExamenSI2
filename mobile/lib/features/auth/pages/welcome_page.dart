import 'package:flutter/material.dart';

import '../../auth/widgets/auth_top_brand.dart';
import '../../auth/widgets/gradient_primary_button.dart';
import 'login_page.dart';
import 'register_page.dart';

class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  static const routeName = '/';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: Image.network(
              'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1300&q=80',
              fit: BoxFit.cover,
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x55F9F9F9), Color(0xE6F9F9F9)],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const AuthTopBrand(),
                  const Spacer(),
                  Center(
                    child: Container(
                      width: 132,
                      height: 132,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(32),
                        color: Colors.white,
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x2A005EA4),
                            blurRadius: 36,
                            offset: Offset(0, 14),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Container(
                          width: 92,
                          height: 92,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(24),
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF0077CE), Color(0xFF005EA4)],
                            ),
                          ),
                          child: const Icon(
                            Icons.health_and_safety,
                            color: Colors.white,
                            size: 46,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 26),
                  const Text(
                    'CeroEspera',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 44,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.2,
                      color: Color(0xFF1A1C1C),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Tu guardian en el camino',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0077CE),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Monitoreo en tiempo real y asistencia inteligente para emergencias vehiculares.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF404752),
                      height: 1.4,
                    ),
                  ),
                  const Spacer(),
                  GradientPrimaryButton(
                    label: 'Iniciar Sesion',
                    icon: Icons.arrow_forward,
                    onPressed: () =>
                        Navigator.pushNamed(context, LoginPage.routeName),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () =>
                        Navigator.pushNamed(context, RegisterPage.routeName),
                    child: const Text('Crear Cuenta'),
                  ),
                  const SizedBox(height: 18),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.help_outline, size: 18),
                    label: const Text('Necesitas ayuda?'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
