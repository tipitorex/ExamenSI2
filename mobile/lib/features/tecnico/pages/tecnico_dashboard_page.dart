import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_theme.dart';
import '../../auth/services/auth_api_service.dart';
import '../models/asignacion_tecnico_model.dart';
import 'asignaciones_page.dart';
import 'detalle_asignacion_page.dart';

class TecnicoDashboardPage extends StatefulWidget {
  const TecnicoDashboardPage({super.key});

  static const routeName = '/tecnico/dashboard';

  @override
  State<TecnicoDashboardPage> createState() => _TecnicoDashboardPageState();
}

class _TecnicoDashboardPageState extends State<TecnicoDashboardPage> {
  int _selectedIndex = 0;
  String _nombreTecnico = 'Técnico';
  String _especialidad = '';
  int _pendientesCount = 0;

  final List<Widget> _pages = [];

  @override
  void initState() {
    super.initState();
    _cargarDatosTecnico();
  }

  Future<void> _cargarDatosTecnico() async {
    final tecnico = await AuthApiService.instance
        .obtenerSesionTecnicoGuardada();
    if (mounted && tecnico != null) {
      setState(() {
        // Tomar solo el primer nombre o acortar si es muy largo
        String nombreCompleto = tecnico.nombreCompleto;
        String primerNombre = nombreCompleto.split(' ').first;
        if (primerNombre.length > 12) {
          primerNombre = primerNombre.substring(0, 10) + '...';
        }
        _nombreTecnico = primerNombre;

        // Acortar especialidad si es muy larga
        String especialidad = tecnico.especialidad ?? 'General';
        if (especialidad.length > 15) {
          especialidad = especialidad.substring(0, 12) + '...';
        }
        _especialidad = especialidad;

        _pages.clear();
        _pages.add(
          AsignacionesPage(
            onCountChanged: (count) {
              setState(() {
                _pendientesCount = count;
              });
            },
          ),
        );
        _pages.add(_PerfilPage(tecnico: tecnico));
      });
    }
  }

  Future<void> _cerrarSesion() async {
    await AuthApiService.instance.cerrarSesion();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(Icons.engineering, size: 22),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'Hola, $_nombreTecnico',
                style: const TextStyle(fontSize: 16),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        actions: [
          // Indicador de especialidad
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.work_outline, size: 14),
                const SizedBox(width: 4),
                Text(
                  _especialidad,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.exit_to_app),
            onPressed: _cerrarSesion,
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: _pages.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: Colors.grey,
        items: [
          BottomNavigationBarItem(
            icon: Stack(
              children: [
                const Icon(Icons.assignment_outlined),
                if (_pendientesCount > 0)
                  Positioned(
                    right: 0,
                    top: 0,
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
                        '$_pendientesCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            activeIcon: const Icon(Icons.assignment),
            label: 'Asignaciones',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }
}

// ============================================================
// PÁGINA DE PERFIL DEL TÉCNICO
// ============================================================

class _PerfilPage extends StatelessWidget {
  final dynamic tecnico;

  const _PerfilPage({required this.tecnico});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 20),
          CircleAvatar(
            radius: 60,
            backgroundColor: AppTheme.primary.withOpacity(0.1),
            child: const Icon(
              Icons.engineering,
              size: 60,
              color: AppTheme.primary,
            ),
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _infoRow('Nombre completo', tecnico.nombreCompleto),
                  const Divider(),
                  _infoRow('Especialidad', tecnico.especialidad ?? 'General'),
                  const Divider(),
                  _infoRow('Teléfono', tecnico.telefono ?? 'No registrado'),
                  const Divider(),
                  _infoRow(
                    'Estado',
                    tecnico.disponible ? 'Disponible' : 'No disponible',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Card(
            color: Colors.orange.shade50,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange.shade700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Para recibir asignaciones, asegúrate de estar disponible.',
                      style: TextStyle(color: Colors.orange.shade800),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
