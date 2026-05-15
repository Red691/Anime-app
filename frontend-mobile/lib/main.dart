// lib/main.dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'app.dart';
import 'core/utils/logger.dart';
import 'data/models/watch_history_model.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize Hive for local storage
  await Hive.initFlutter();
  Hive.registerAdapter(WatchHistoryModelAdapter());
  await Hive.openBox<<WatchHistoryModel>('watch_history');
  await Hive.openBox('settings');
  await Hive.openBox('downloads');
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0A0A0A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  
  // Global error handling
  FlutterError.onError = (FlutterErrorDetails details) {
    AppLogger.error('Flutter Error', details.exception, details.stack);
  };
  
  runApp(
    const ProviderScope(
      child: AnimeStreamApp(),
    ),
  );
}
