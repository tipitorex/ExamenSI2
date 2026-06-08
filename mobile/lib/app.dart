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
import 'features/resenas/pages/resena_page.dart';
import 'services/notification_service.dart';
import 'services/sync_service.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

class CeroEsperaApp extends StatefulWidget {
  const CeroEsperaApp({super.key});

  @override
  State<CeroEsperaApp> createState() => _CeroEsperaAppState();
}

class _CeroEsperaAppState extends State<CeroEsperaApp> {
  @override
  void initState() {
    super.initState();
    SyncService.instance.inicializar();
  }

  @override
  Widget build(BuildContext context) {
    NotificationService.navigatorKey = navigatorKey;

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CeroEspera',
      theme: AppTheme.lightTheme,
      navigatorKey: navigatorKey,
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

        // ============================================================
        // RESEÑAS
        // ============================================================
        ResenaPage.routeName: (ctx) {
          final args = ModalRoute.of(ctx)!.settings.arguments as Map<String, dynamic>;
          return ResenaPage(
            incidenteId: args['incidente_id'] as int,
            tallerNombre: args['taller_nombre'] as String?,
            tecnicoNombre: args['tecnico_nombre'] as String?,
          );
        },
      },
    );
  }
}
