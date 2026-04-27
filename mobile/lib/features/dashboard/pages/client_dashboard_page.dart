import 'package:flutter/material.dart';

import '../../auth/services/auth_api_service.dart';
import '../../incidents/pages/incident_report_page.dart';
import '../../vehicles/pages/vehicle_register_page.dart';
import '../../profile/pages/profile_page.dart';
import '../../notifications/pages/notifications_page.dart';
import '../../../services/in_app_notification_service.dart';
import '../../pagos/pages/mis_facturas_page.dart';
import '../../dashboard/widgets/active_incident_tracker.dart';
import '../../incidents/pages/historial_page.dart';
import '../../vehicles/pages/mis_vehiculos_page.dart'; // ← NUEVA IMPORTACIÓN

class ClientDashboardPage extends StatefulWidget {
  const ClientDashboardPage({super.key});

  static const routeName = '/dashboard';

  @override
  State<ClientDashboardPage> createState() => _ClientDashboardPageState();
}

class _ClientDashboardPageState extends State<ClientDashboardPage> {
  int _selectedTab = 0;
  String _displayName = 'Cliente';
  late List<Widget> _pages;

  int _notificacionesNoLeidas = 0;
  final InAppNotificationService _notificacionService =
      InAppNotificationService();

  // Key para refrescar el contenido del home
  final GlobalKey<_HomeContentState> _homeContentKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    _pages = [
      _HomeContent(
        key: _homeContentKey,
        displayName: 'Cliente',
        onRefreshNotificaciones: _cargarContadorNotificaciones,
        onGoToHistorial: _irAlHistorial,
      ),
      const HistorialPage(),
      const MisVehiculosPage(), // ← REEMPLAZADO
      const MisFacturasPage(),
      const ProfilePage(),
    ];
    _cargarSesion();
    _cargarContadorNotificaciones();
  }

  // Método para refrescar todo el dashboard desde fuera
  Future<void> refrescarDashboard() async {
    await _cargarSesion();
    await _cargarContadorNotificaciones();
    _homeContentKey.currentState?.refrescarContenido();
  }

  Future<void> _cargarSesion() async {
    final cliente = await AuthApiService.instance.obtenerSesionGuardada();
    if (!mounted || cliente == null) {
      return;
    }

    setState(() {
      _displayName = cliente.nombreCompleto.split(' ').first;
      _pages = [
        _HomeContent(
          key: _homeContentKey,
          displayName: _displayName,
          onRefreshNotificaciones: _cargarContadorNotificaciones,
          onGoToHistorial: _irAlHistorial,
        ),
        const HistorialPage(),
        const MisVehiculosPage(), // ← REEMPLAZADO
        const MisFacturasPage(),
        const ProfilePage(),
      ];
    });
  }

  void _irAlHistorial() {
    setState(() {
      _selectedTab = 1;
    });
  }

  Future<void> _cargarContadorNotificaciones() async {
    final notificaciones = await _notificacionService.obtenerNotificaciones();
    setState(() {
      _notificacionesNoLeidas = notificaciones.where((n) => !n.leido).length;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedTab,
        onDestinationSelected: (index) {
          setState(() {
            _selectedTab = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            label: 'Inicio',
          ),
          NavigationDestination(icon: Icon(Icons.history), label: 'Historial'),
          NavigationDestination(
            icon: Icon(Icons.directions_car_outlined),
            label: 'Vehículos',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_outlined),
            label: 'Facturas',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Perfil',
          ),
        ],
      ),
      body: _pages[_selectedTab],
    );
  }
}

// ============================================================
// CONTENIDO DE INICIO (HOME) CON PULL TO REFRESH
// ============================================================

class _HomeContent extends StatefulWidget {
  const _HomeContent({
    super.key,
    required this.displayName,
    required this.onRefreshNotificaciones,
    required this.onGoToHistorial,
  });

  final String displayName;
  final VoidCallback onRefreshNotificaciones;
  final VoidCallback onGoToHistorial;

  @override
  State<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends State<_HomeContent> {
  int _notificacionesNoLeidas = 0;
  final InAppNotificationService _notificacionService =
      InAppNotificationService();

  // Estado para saber si está refrescando
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _cargarContador();
  }

  Future<void> _cargarContador() async {
    final notificaciones = await _notificacionService.obtenerNotificaciones();
    if (mounted) {
      setState(() {
        _notificacionesNoLeidas = notificaciones.where((n) => !n.leido).length;
      });
    }
  }

  // Método público para refrescar el contenido
  Future<void> refrescarContenido() async {
    await _cargarContador();
    widget.onRefreshNotificaciones();
  }

  // Pull to refresh - se ejecuta cuando el usuario desliza hacia abajo
  Future<void> _onRefresh() async {
    setState(() {
      _isRefreshing = true;
    });

    try {
      // Recargar notificaciones
      await _cargarContador();
      widget.onRefreshNotificaciones();

      // Pequeña pausa para que se vea bien el efecto
      await Future.delayed(const Duration(milliseconds: 500));
    } finally {
      if (mounted) {
        setState(() {
          _isRefreshing = false;
        });
      }
    }
  }

  Future<void> _abrirNotificaciones() async {
    await Navigator.pushNamed(context, NotificationsPage.routeName);
    await _cargarContador();
    widget.onRefreshNotificaciones();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _onRefresh,
      color: const Color(0xFF005EA4),
      backgroundColor: Colors.white,
      child: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Ubicacion Actual',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF005EA4),
                            ),
                          ),
                        ),
                        Stack(
                          children: [
                            IconButton(
                              onPressed: _abrirNotificaciones,
                              icon: const Icon(
                                Icons.notifications_none_rounded,
                              ),
                            ),
                            if (_notificacionesNoLeidas > 0)
                              Positioned(
                                right: 4,
                                top: 4,
                                child: Container(
                                  padding: const EdgeInsets.all(2),
                                  decoration: const BoxDecoration(
                                    color: Colors.red,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 14,
                                    minHeight: 14,
                                  ),
                                  child: Text(
                                    '$_notificacionesNoLeidas',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        CircleAvatar(
                          backgroundColor: const Color(0xFFD3E4FF),
                          child: Text(
                            widget.displayName.isNotEmpty
                                ? widget.displayName[0].toUpperCase()
                                : 'C',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF001C38),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Hola, ${widget.displayName}',
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                        height: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Todo parece estar en orden para tu viaje de hoy. Estamos aqui si nos necesitas.',
                      style: TextStyle(color: Color(0xFF404752), fontSize: 16),
                    ),
                    const SizedBox(height: 20),
                    _VehicleStatusCard(
                      onRegisterVehicle: () {
                        Navigator.pushNamed(
                          context,
                          VehicleRegisterPage.routeName,
                        );
                      },
                    ),
                    const SizedBox(height: 14),
                    _SosCard(
                      onPress: () {
                        Navigator.pushNamed(
                          context,
                          IncidentReportPage.routeName,
                        );
                      },
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: _QuickCard(
                            icon: Icons.map_outlined,
                            title: 'Talleres Cercanos',
                            description:
                                'Mecanicos certificados a menos de 5 km.',
                            action: 'Explorar mapa',
                            onTap: () {},
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _QuickCard(
                            icon: Icons.description_outlined,
                            title: 'Historial Reciente',
                            description: 'Viajes e incidentes de esta semana.',
                            action: 'Ver reportes',
                            onTap: widget.onGoToHistorial,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Mi Incidente Activo',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const ActiveIncidentTracker(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// WIDGETS AUXILIARES
// ============================================================

class _VehicleStatusCard extends StatelessWidget {
  const _VehicleStatusCard({required this.onRegisterVehicle});

  final VoidCallback onRegisterVehicle;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          colors: [Color(0xFF005EA4), Color(0xFF0077CE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x29001C38),
            blurRadius: 26,
            offset: Offset(0, 12),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Vehiculos',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 24,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Seguridad',
                      style: TextStyle(color: Color(0xFFDBECFF)),
                    ),
                  ],
                ),
                Chip(
                  backgroundColor: Color(0x30D3E4FF),
                  side: BorderSide.none,
                  label: Text(
                    'SISTEMA OK',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Text(
              'Registra tu vehiculo para reportes precisos y asistencia mas rapida.',
              style: TextStyle(color: Color(0xFFE3EEFB)),
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: onRegisterVehicle,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF8F06),
                minimumSize: const Size.fromHeight(48),
              ),
              icon: const Icon(Icons.directions_car_filled_outlined),
              label: const Text('Registrar mi vehiculo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SosCard extends StatelessWidget {
  const _SosCard({required this.onPress});

  final VoidCallback onPress;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E7),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: const Color(0xFFFFD4A8)),
      ),
      child: Column(
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0x40FF8F06),
            ),
            child: const Icon(
              Icons.emergency,
              size: 48,
              color: Color(0xFF8F4E00),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'EMERGENCIA SOS',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          const Text(
            'Documenta el incidente y solicita asistencia de inmediato.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF623300)),
          ),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: onPress,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFF8F06),
              minimumSize: const Size.fromHeight(50),
            ),
            child: const Text('Solicitar asistencia'),
          ),
        ],
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  const _QuickCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.action,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String description;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: Ink(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0x1AC0C7D4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFD3E4FF),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: const Color(0xFF005EA4)),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
            ),
            const SizedBox(height: 6),
            Text(
              description,
              style: const TextStyle(fontSize: 13, color: Color(0xFF404752)),
            ),
            const SizedBox(height: 8),
            Text(
              action.toUpperCase(),
              style: const TextStyle(
                color: Color(0xFF005EA4),
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
