// lib/presentation/providers/auth_provider.dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../services/api_service.dart';
import '../../core/utils/logger.dart';

// Firebase Auth State
final firebaseAuthProvider = StreamProvider<User?>((ref) {
  return FirebaseAuth.instance.authStateChanges();
});

// Auth State Notifier
final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider.stream);
});

// Current User Profile
final userProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>?>((ref) async {
  final authState = await ref.watch(authStateProvider.future);
  if (authState == null) return null;
  
  try {
    final api = ref.read(apiServiceProvider);
    final response = await api.getProfile();
    return response.data['data'];
  } catch (e) {
    AppLogger.error('Failed to fetch profile', e);
    return null;
  }
});

// Auth Controller
final authControllerProvider = StateNotifierProvider<<AuthController, AsyncValue<void>>((ref) {
  return AuthController(ref);
});

class AuthController extends StateNotifier<<AsyncValue<void>> {
  final Ref _ref;
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  AuthController(this._ref) : super(const AsyncValue.data(null));

  Future<void> signInWithEmail(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
      state = const AsyncValue.data(null);
    } on FirebaseAuthException catch (e, stack) {
      state = AsyncValue.error(_getAuthErrorMessage(e), stack);
    } catch (e, stack) {
      state = AsyncValue.error('An unexpected error occurred', stack);
    }
  }

  Future<void> signInWithGoogle() async {
    state = const AsyncValue.loading();
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        state = const AsyncValue.data(null);
        return;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      await _auth.signInWithCredential(credential);
      state = const AsyncValue.data(null);
    } on FirebaseAuthException catch (e, stack) {
      state = AsyncValue.error(_getAuthErrorMessage(e), stack);
    } catch (e, stack) {
      state = AsyncValue.error('Google sign in failed', stack);
    }
  }

  Future<void> register(String email, String password, String displayName) async {
    state = const AsyncValue.loading();
    try {
      final result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      await result.user?.updateDisplayName(displayName);
      
      // Force token refresh to ensure profile is updated
      await result.user?.getIdToken(true);
      
      state = const AsyncValue.data(null);
    } on FirebaseAuthException catch (e, stack) {
      state = AsyncValue.error(_getAuthErrorMessage(e), stack);
    } catch (e, stack) {
      state = AsyncValue.error('Registration failed', stack);
    }
  }

  Future<void> signOut() async {
    state = const AsyncValue.loading();
    try {
      await _googleSignIn.signOut();
      await _auth.signOut();
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error('Sign out failed', stack);
    }
  }

  String _getAuthErrorMessage(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'No account found with this email.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'email-already-in-use':
        return 'An account already exists with this email.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'weak-password':
        return 'Password should be at least 6 characters.';
      case 'user-disabled':
        return 'This account has been disabled.';
      default:
        return e.message ?? 'Authentication failed.';
    }
  }
}
