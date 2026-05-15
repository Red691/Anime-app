// lib/services/api_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../core/utils/logger.dart';

final apiServiceProvider = Provider<<ApiService>((ref) {
  return ApiService();
});

class ApiService {
  late final Dio _dio;
  static const String baseUrl = 'https://api.yourdomain.com/api/v1';
  
  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
    _dio.interceptors.add(_authInterceptor());
    _dio.interceptors.add(_loggingInterceptor());
    _dio.interceptors.add(_errorInterceptor());
  }

  Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Get Firebase token
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          final token = await user.getIdToken();
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Token refresh logic
        if (error.response?.statusCode == 401) {
          try {
            final user = FirebaseAuth.instance.currentUser;
            if (user != null) {
              final newToken = await user.getIdToken(true);
              error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
              // Retry request
              final response = await _dio.fetch(error.requestOptions);
              handler.resolve(response);
              return;
            }
          } catch (e) {
            AppLogger.error('Token refresh failed', e);
          }
        }
        handler.next(error);
      },
    );
  }

  Interceptor _loggingInterceptor() {
    return LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (obj) => AppLogger.debug(obj.toString()),
    );
  }

  Interceptor _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        String message = 'An error occurred';
        
        if (error.type == DioExceptionType.connectionTimeout) {
          message = 'Connection timeout. Please check your internet.';
        } else if (error.type == DioExceptionType.receiveTimeout) {
          message = 'Server is taking too long to respond.';
        } else if (error.type == DioExceptionType.connectionError) {
          message = 'No internet connection.';
        } else if (error.response != null) {
          message = error.response?.data?['message'] ?? 'Server error occurred';
        }
        
        AppLogger.error('API Error', error, error.stackTrace);
        handler.next(error.copyWith(
          message: message,
        ));
      },
    );
  }

  // Anime APIs
  Future<Response> getAnimeList({
    int page = 1,
    int limit = 20,
    String? sort,
    String? status,
    String? genre,
    String? search,
  }) async {
    return _dio.get('/anime', queryParameters: {
      'page': page,
      'limit': limit,
      if (sort != null) 'sort': sort,
      if (status != null) 'status': status,
      if (genre != null) 'genre': genre,
      if (search != null) 'search': search,
    });
  }

  Future<Response> getAnimeDetails(String slug) async {
    return _dio.get('/anime/$slug');
  }

  Future<Response> getTrendingAnime({String period = 'week', int limit = 10}) async {
    return _dio.get('/anime/trending', queryParameters: {
      'period': period,
      'limit': limit,
    });
  }

  Future<Response> getLatestEpisodes({int limit = 12}) async {
    return _dio.get('/anime/latest', queryParameters: {'limit': limit});
  }

  // Episode APIs
  Future<Response> getEpisode(String animeSlug, int episodeNumber) async {
    return _dio.get('/episodes/$animeSlug/$episodeNumber');
  }

  Future<Response> updateWatchProgress(
    String episodeId, {
    required int progress,
    required int duration,
    String? quality,
    String? subtitleLanguage,
  }) async {
    return _dio.post('/episodes/$episodeId/progress', data: {
      'progress': progress,
      'duration': duration,
      if (quality != null) 'quality': quality,
      if (subtitleLanguage != null) 'subtitleLanguage': subtitleLanguage,
    });
  }

  Future<Response> getContinueWatching() async {
    return _dio.get('/episodes/continue-watching');
  }

  // User APIs
  Future<Response> getProfile() async {
    return _dio.get('/users/profile');
  }

  Future<Response> updateProfile(Map<String, dynamic> data) async {
    return _dio.put('/users/profile', data: data);
  }

  Future<Response> toggleFavorite(String animeId) async {
    return _dio.post('/users/favorites', data: {'animeId': animeId});
  }

  Future<Response> getFavorites({int page = 1, int limit = 20}) async {
    return _dio.get('/users/favorites', queryParameters: {
      'page': page,
      'limit': limit,
    });
  }

  Future<Response> getWatchHistory({int page = 1, int limit = 20}) async {
    return _dio.get('/users/history', queryParameters: {
      'page': page,
      'limit': limit,
    });
  }

  Future<Response> rateAnime(String animeId, int score, {String? review}) async {
    return _dio.post('/users/rate', data: {
      'animeId': animeId,
      'score': score,
      if (review != null) 'review': review,
    });
  }
}
