import 'package:flutter/material.dart';
import '../../auth/services/auth_api_service.dart';
import '../../auth/pages/login_page.dart';
import '../../auth/models/cliente_model.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  static const routeName = '/perfil';

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  ClienteModel? _cliente;
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _cargarPerfil();
  }

  Future<void> _cargarPerfil() async {
    final cliente = await AuthApiService.instance.obtenerSesionGuardada();
    if (!mounted) return;

    setState(() {
      _cliente = cliente;
      _cargando = false;
    });
  }

  Future<void> _cerrarSesion() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar Sesión'),
        content: const Text('¿Estás seguro de que deseas cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Cerrar Sesión'),
          ),
        ],
      ),
    );

    if (confirmar == true) {
      await AuthApiService.instance.limpiarSesion();

      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (context) => const LoginPage()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi Perfil'),
        backgroundColor: const Color(0xFF005EA4),
        foregroundColor: Colors.white,
      ),
      body: _cargando
          ? const Center(child: CircularProgressIndicator())
          : _cliente == null
          ? const Center(child: Text('Error al cargar perfil'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Avatar
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: const Color(0xFFD3E4FF),
                    child: Text(
                      (_cliente!.nombreCompleto.isNotEmpty
                              ? _cliente!.nombreCompleto[0]
                              : 'C')
                          .toUpperCase(),
                      style: const TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF005EA4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Nombre
                  Text(
                    _cliente!.nombreCompleto,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Email
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: ListTile(
                      leading: const Icon(Icons.email_outlined),
                      title: const Text('Correo Electrónico'),
                      subtitle: Text(_cliente!.email),
                    ),
                  ),
                  // Teléfono
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 8),
                    child: ListTile(
                      leading: const Icon(Icons.phone_outlined),
                      title: const Text('Teléfono'),
                      subtitle: Text(_cliente!.telefono ?? 'No registrado'),
                    ),
                  ),
                  const SizedBox(height: 30),
                  // Botón cerrar sesión
                  ElevatedButton.icon(
                    onPressed: _cerrarSesion,
                    icon: const Icon(Icons.logout),
                    label: const Text('Cerrar Sesión'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Versión 1.0.0',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
    );
  }
}
