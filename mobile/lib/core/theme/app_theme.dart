import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFF005EA4);
  static const Color primaryContainer = Color(0xFF0077CE);
  static const Color surface = Color(0xFFF9F9F9);
  static const Color surfaceContainer = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF1A1C1C);
  static const Color textSecondary = Color(0xFF404752);
  static const Color outline = Color(0xFFC0C7D4);

  static ThemeData get lightTheme {
    final base = ThemeData.light(useMaterial3: true);

    return base.copyWith(
      colorScheme: const ColorScheme.light(
        primary: primary,
        secondary: Color(0xFF8F4E00),
        surface: surface,
      ),
      scaffoldBackgroundColor: surface,
      textTheme: base.textTheme.copyWith(
        headlineLarge: const TextStyle(
          fontSize: 38,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.8,
          color: textPrimary,
        ),
        headlineMedium: const TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w700,
          color: textPrimary,
        ),
        titleMedium: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: textPrimary,
        ),
        bodyLarge: const TextStyle(
          fontSize: 16,
          height: 1.45,
          color: textSecondary,
        ),
        bodyMedium: const TextStyle(
          fontSize: 14,
          height: 1.4,
          color: textSecondary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF1F4F8),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: primary, width: 1.4),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          minimumSize: const Size.fromHeight(58),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          minimumSize: const Size.fromHeight(58),
        ),
      ),
    );
  }
}
