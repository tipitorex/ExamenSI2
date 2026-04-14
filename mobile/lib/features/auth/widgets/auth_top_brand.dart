import 'package:flutter/material.dart';

class AuthTopBrand extends StatelessWidget {
  const AuthTopBrand({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: const Color(0xFF0077CE),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.shield, color: Colors.white, size: 22),
        ),
        const SizedBox(width: 10),
        const Text(
          'CeroEspera',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
            color: Color(0xFF005EA4),
          ),
        ),
      ],
    );
  }
}
