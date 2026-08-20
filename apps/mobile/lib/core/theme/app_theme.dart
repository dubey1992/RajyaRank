import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Colour tokens ported 1:1 from packages/ui/src/tailwind-preset.ts so the
/// app reads as the same product as rajyarank.com, not a re-skin.
class AppColors {
  AppColors._();

  static const navy100 = Color(0xFFEAF3F8);
  static const navy800 = Color(0xFF12476F);
  static const navy900 = Color(0xFF0B2F4F);
  static const navy950 = Color(0xFF071F35);

  static const orange100 = Color(0xFFFFEDD5);
  static const orange500 = Color(0xFFF97316);
  static const orange600 = Color(0xFFEA580C);

  static const teal100 = Color(0xFFDDF7F1);
  static const teal500 = Color(0xFF0EA58A);
  static const teal600 = Color(0xFF0F8B78);

  static const ink = Color(0xFF102235);
  static const muted = Color(0xFF607286);
  static const line = Color(0xFFDFE8EE);
  static const surfaceSoft = Color(0xFFF6F9FB);
  static const success = Color(0xFF15803D);
  static const danger = Color(0xFFBE123C);
  static const warning = Color(0xFFB45309);
}

/// Reusable gradients for the "hero" surfaces (dashboard readiness/streak
/// cards, catalogue highlights) — layered on top of the flat brand palette
/// above rather than replacing it, so the app stays recognizably the same
/// product as web while reading as more dynamic in the spots that earn it.
class AppGradients {
  AppGradients._();

  static const hero = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.navy900, AppColors.navy950],
  );

  static const teal = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.teal500, AppColors.teal600],
  );

  static const orange = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.orange500, AppColors.orange600],
  );

  static List<BoxShadow> softShadow(Color color) => [
    BoxShadow(
      color: color.withValues(alpha: 0.18),
      blurRadius: 20,
      offset: const Offset(0, 8),
    ),
  ];
}

class AppTheme {
  AppTheme._();

  static ThemeData light() {
    final textTheme = GoogleFonts.interTextTheme();
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.navy900,
      brightness: Brightness.light,
      primary: AppColors.navy900,
      secondary: AppColors.orange500,
      tertiary: AppColors.teal500,
      error: AppColors.danger,
      surface: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.surfaceSoft,
      textTheme: textTheme.apply(
        bodyColor: AppColors.ink,
        displayColor: AppColors.ink,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.navy900,
        foregroundColor: Colors.white,
        centerTitle: false,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.navy900,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.navy900, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
    );
  }
}
