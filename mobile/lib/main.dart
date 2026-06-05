import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'firebase_options.dart';
import 'app.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Solo inicializar Firebase en móvil (en web usa la web version)
  if (!kIsWeb) {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    await NotificationService.initialize();

    // Stripe solo en móvil
    Stripe.publishableKey =
        'pk_test_51TPEjhJmfJgcqzGehfmGWxsab6PUmXDdjsTgdIPuxtypUNfYEw49VLw4I4hP9lziD7B039uf7iNKL6uhyGZSWuC700FFuxzuzI';
  } else {
    print('🌐 Modo Web - Firebase y Stripe deshabilitados');
  }

  runApp(const CeroEsperaApp());
}
