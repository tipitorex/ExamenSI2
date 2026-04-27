import 'package:flutter/material.dart';

class ProgressTimeline extends StatefulWidget {
  final double progress;
  final List<String> stages;

  const ProgressTimeline({
    super.key,
    required this.progress,
    required this.stages,
  });

  @override
  State<ProgressTimeline> createState() => _ProgressTimelineState();
}

class _ProgressTimelineState extends State<ProgressTimeline>
    with TickerProviderStateMixin {
  late AnimationController _progressController;
  late Animation<double> _animatedProgress;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _animatedProgress = Tween<double>(begin: 0, end: widget.progress).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOutCubic),
    );
    _progressController.forward();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void didUpdateWidget(ProgressTimeline oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.progress != widget.progress) {
      _animatedProgress =
          Tween<double>(
            begin: oldWidget.progress,
            end: widget.progress,
          ).animate(
            CurvedAnimation(
              parent: _progressController,
              curve: Curves.easeOutCubic,
            ),
          );
      _progressController.reset();
      _progressController.forward();
    }
  }

  @override
  void dispose() {
    _progressController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Progreso',
          style: TextStyle(color: Colors.white70, fontSize: 12),
        ),
        const SizedBox(height: 8),
        AnimatedBuilder(
          animation: _animatedProgress,
          builder: (context, child) {
            return AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                // Cambia entre 0.3 y 1.0 para que sea muy notorio
                final pulseValue = 0.3 + (_pulseController.value * 0.7);
                return ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: _animatedProgress.value,
                    backgroundColor: Colors.white.withOpacity(0.15),
                    color: Colors.white.withOpacity(pulseValue),
                    minHeight: 10,
                  ),
                );
              },
            );
          },
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: widget.stages.map((stage) {
            return Text(
              stage,
              style: const TextStyle(color: Colors.white70, fontSize: 10),
            );
          }).toList(),
        ),
      ],
    );
  }
}
