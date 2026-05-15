// lib/presentation/providers/anime_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../services/api_service.dart';

// Trending Anime
final trendingAnimeProvider = FutureProvider.autoDispose<List<<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getTrendingAnime(limit: 10);
  return response.data['data'] as List<<dynamic>;
});

// Latest Episodes
final latestEpisodesProvider = FutureProvider.autoDispose<List<<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getLatestEpisodes(limit: 12);
  return response.data['data'] as List<<dynamic>;
});

// Popular Anime
final popularAnimeProvider = FutureProvider.autoDispose<List<<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getAnimeList(
    sort: 'popularity',
    limit: 15,
  );
  return response.data['data']['data'] as List<<dynamic>;
});

// Anime Details
final animeDetailsProvider = FutureProvider.family.autoDispose<Map<String, dynamic>, String>((ref, slug) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getAnimeDetails(slug);
  return response.data['data'] as Map<String, dynamic>;
});

// Continue Watching
final continueWatchingProvider = FutureProvider.autoDispose<List<<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final response = await api.getContinueWatching();
  return response.data['data'] as List<<dynamic>;
});
