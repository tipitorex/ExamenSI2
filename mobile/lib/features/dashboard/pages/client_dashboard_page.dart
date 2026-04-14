import 'package:flutter/material.dart';

import '../../auth/services/auth_api_service.dart';
import '../../incidents/pages/incident_report_page.dart';
import '../../vehicles/pages/vehicle_register_page.dart';

class ClientDashboardPage extends StatefulWidget {
  const ClientDashboardPage({super.key});

  static const routeName = '/dashboard';

  @override
  State<ClientDashboardPage> createState() => _ClientDashboardPageState();
}

class _ClientDashboardPageState extends State<ClientDashboardPage> {
  int _selectedTab = 0;
  String _displayName = 'Cliente';

  @override
  void initState() {
    super.initState();
    _cargarSesion();
  }

  Future<void> _cargarSesion() async {
    final cliente = await AuthApiService.instance.obtenerSesionGuardada();
    if (!mounted || cliente == null) {
      return;
    }

    setState(() {
      _displayName = cliente.nombreCompleto.split(' ').first;
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
            label: 'Vehiculos',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Perfil',
          ),
        ],
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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
                        IconButton(
                          onPressed: () {},
                          icon: const Icon(Icons.notifications_none_rounded),
                        ),
                        CircleAvatar(
                          backgroundColor: const Color(0xFFD3E4FF),
                          child: Text(
                            _displayName.substring(0, 1).toUpperCase(),
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
                      'Hola, $_displayName',
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
                    _VehicleStatusCard(onRegisterVehicle: _irARegistroVehiculo),
                    const SizedBox(height: 14),
                    _SosCard(onPress: _irAReporteIncidente),
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
                            onTap: () {},
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Alertas en Vivo',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const _LiveAlertTile(
                      color: Color(0xFFFF8F06),
                      tag: 'ALERTA CRITICA',
                      title: 'Lluvia intensa en la Ruta 42',
                      subtitle: 'Visibilidad reducida. Conduce con precaucion.',
                    ),
                    const SizedBox(height: 10),
                    const _LiveAlertTile(
                      color: Color(0xFF005EA4),
                      tag: 'MANTENIMIENTO',
                      title: 'Escaneo mensual completado',
                      subtitle: 'Tu vehiculo se encuentra en rango optimo.',
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _irAReporteIncidente() {
    Navigator.pushNamed(context, IncidentReportPage.routeName);
  }

  void _irARegistroVehiculo() {
    Navigator.pushNamed(context, VehicleRegisterPage.routeName);
  }
}

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
                      'Toyota Hilux',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 24,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'PLACA: ABC-123',
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

class _LiveAlertTile extends StatelessWidget {
  const _LiveAlertTile({
    required this.color,
    required this.tag,
    required this.title,
    required this.subtitle,
  });

  final Color color;
  final String tag;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Container(
            width: 6,
            height: 56,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$tag • HACE POCO',
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(color: Color(0xFF404752)),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right),
        ],
      ),
    );
  }
}
