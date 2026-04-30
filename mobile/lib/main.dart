import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'firebase_options.dart';
import 'app.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await NotificationService.initialize();

  // 🔥 AGREGAR: Configurar Stripe (modo prueba)
  // Reemplaza 'pk_test_xxxxx' con tu clave publicable de Stripe
  Stripe.publishableKey =
      'pk_test_51TPEjhJmfJgcqzGehfmGWxsab6PUmXDdjsTgdIPuxtypUNfYEw49VLw4I4hP9lziD7B039uf7iNKL6uhyGZSWuC700FFuxzuzI';

  runApp(const CeroEsperaApp());
}
