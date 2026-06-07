import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/pages/login_page.dart';
import 'features/auth/pages/register_page.dart';
import 'features/auth/pages/welcome_page.dart';
import 'features/dashboard/pages/client_dashboard_page.dart';
import 'features/incidents/pages/incident_report_page.dart';
import 'features/vehicles/pages/vehicle_register_page.dart';
import 'features/notifications/pages/notifications_page.dart';
import 'features/vehicles/pages/mis_vehiculos_page.dart';
import 'features/tecnico/pages/tecnico_dashboard_page.dart'; // ← AGREGAR
import 'features/tecnico/pages/asignaciones_page.dart';
import 'features/cotizaciones/pages/cotizaciones_page.dart';
import 'features/incidents/pages/client_tracking_page.dart';

class CeroEsperaApp extends StatelessWidget {
  const CeroEsperaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CeroEspera',
      theme: AppTheme.lightTheme,
      initialRoute: WelcomePage.routeName,
      routes: {
        WelcomePage.routeName: (_) => const WelcomePage(),
        LoginPage.routeName: (_) => const LoginPage(),
        RegisterPage.routeName: (_) => const RegisterPage(),
        ClientDashboardPage.routeName: (_) => const ClientDashboardPage(),
        IncidentReportPage.routeName: (_) => const IncidentReportPage(),
        VehicleRegisterPage.routeName: (_) => const VehicleRegisterPage(),
        NotificationsPage.routeName: (_) => const NotificationsPage(),
        MisVehiculosPage.routeName: (_) => const MisVehiculosPage(),

        // ============================================================
        // RUTAS PARA TÉCNICO
        // ============================================================
        TecnicoDashboardPage.routeName: (_) => const TecnicoDashboardPage(),
      },
    );
  }
}
