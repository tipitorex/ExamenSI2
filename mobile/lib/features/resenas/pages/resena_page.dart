import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../services/resena_service.dart';

class ResenaPage extends StatefulWidget {
  final int incidenteId;
  final String? tallerNombre;
  final String? tecnicoNombre;

  const ResenaPage({
    super.key,
    required this.incidenteId,
    this.tallerNombre,
    this.tecnicoNombre,
  });

  static const routeName = '/resena';

  @override
  State<ResenaPage> createState() => _ResenaPageState();
}

class _ResenaPageState extends State<ResenaPage> {
  int _puntuacionTaller = 0;
  int _puntuacionTecnico = 0;
  final _comentarioCtrl = TextEditingController();
  bool _enviando = false;
  bool _yaCalificado = false;
  bool _verificando = true;

  @override
  void initState() {
    super.initState();
    _verificarResenaExistente();
  }

  @override
  void dispose() {
    _comentarioCtrl.dispose();
    super.dispose();
  }

  Future<void> _verificarResenaExistente() async {
    final existe = await ResenaService().yaCalificaste(widget.incidenteId);
    if (mounted) {
      setState(() {
        _yaCalificado = existe;
        _verificando = false;
      });
    }
  }

  Future<void> _enviar() async {
    if (_puntuacionTaller == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona una puntuación para el taller')),
      );
      return;
    }

    setState(() => _enviando = true);

    final ok = await ResenaService().enviarResena(
      incidenteId: widget.incidenteId,
      puntuacionTaller: _puntuacionTaller,
      puntuacionTecnico: _puntuacionTecnico > 0 ? _puntuacionTecnico : null,
      comentario: _comentarioCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _enviando = false);

    if (ok) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.star_rounded, color: Colors.amber, size: 64),
              const SizedBox(height: 12),
              const Text(
                '¡Gracias por tu opinión!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Tu reseña ayuda a mejorar el servicio.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                Navigator.of(context).popUntil((route) => route.isFirst);
              },
              child: const Text('Volver al inicio'),
            ),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No se pudo enviar la reseña. Inténtalo de nuevo.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildEstrellas({
    required int valor,
    required ValueChanged<int> onChanged,
    double size = 36,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(5, (i) {
        final estrella = i + 1;
        return GestureDetector(
          onTap: () => onChanged(estrella),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Icon(
              estrella <= valor ? Icons.star_rounded : Icons.star_outline_rounded,
              color: estrella <= valor ? Colors.amber : Colors.grey.shade300,
              size: size,
            ),
          ),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Califica el servicio'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
      body: _verificando
          ? const Center(child: CircularProgressIndicator())
          : _yaCalificado
              ? _buildYaCalificado()
              : _buildFormulario(),
    );
  }

  Widget _buildYaCalificado() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_outline, color: Colors.green, size: 72),
            const SizedBox(height: 16),
            const Text(
              'Ya calificaste este servicio',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Gracias por tu opinión.',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Volver'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormulario() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primary, AppTheme.primary.withOpacity(0.7)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Icon(Icons.star_rounded, color: Colors.amber, size: 48),
                const SizedBox(height: 8),
                const Text(
                  '¿Cómo fue tu experiencia?',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  'Incidente #${widget.incidenteId}',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Calificación del taller
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.business, color: AppTheme.primary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.tallerNombre ?? 'Taller',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Califica al taller *',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  _buildEstrellas(
                    valor: _puntuacionTaller,
                    onChanged: (v) => setState(() => _puntuacionTaller = v),
                  ),
                  if (_puntuacionTaller > 0)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        _labelEstrellas(_puntuacionTaller),
                        style: TextStyle(
                          color: _colorEstrellas(_puntuacionTaller),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Calificación del técnico (opcional)
          if (widget.tecnicoNombre != null)
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.engineering, color: Colors.orange),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.tecnicoNombre!,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const Text(
                          'Opcional',
                          style: TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Califica al técnico',
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    _buildEstrellas(
                      valor: _puntuacionTecnico,
                      onChanged: (v) => setState(() => _puntuacionTecnico = v),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 12),

          // Comentario
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.comment_outlined, color: Colors.grey),
                      SizedBox(width: 8),
                      Text(
                        'Comentario (opcional)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _comentarioCtrl,
                    maxLines: 4,
                    maxLength: 500,
                    decoration: InputDecoration(
                      hintText: 'Cuéntanos tu experiencia...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Botón enviar
          ElevatedButton(
            onPressed: _enviando ? null : _enviar,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _enviando
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Enviar Reseña', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Omitir por ahora', style: TextStyle(color: Colors.grey)),
          ),
        ],
      ),
    );
  }

  String _labelEstrellas(int v) {
    switch (v) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return '';
    }
  }

  Color _colorEstrellas(int v) {
    if (v <= 2) return Colors.red;
    if (v == 3) return Colors.orange;
    return Colors.green;
  }
}
