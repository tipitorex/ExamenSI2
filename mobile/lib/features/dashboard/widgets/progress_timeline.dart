// mobile/lib/features/dashboard/widgets/progress_timeline.dart
import 'package:flutter/material.dart';

class ProgressTimeline extends StatelessWidget {
  final double progress;
  final List<String> stages;

  const ProgressTimeline({
    super.key,
    required this.progress,
    required this.stages,
  });

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
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white.withOpacity(0.3),
            color: Colors.white,
            minHeight: 8,
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: stages.map((stage) {
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
