// lib/presentation/screens/anime/anime_details_screen.dart
import 'package:animate_do/animate_do.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../config/theme.dart';
import '../../providers/anime_provider.dart';
import '../../widgets/episode_list_item.dart';

class AnimeDetailsScreen extends ConsumerWidget {
  final String slug;

  const AnimeDetailsScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailsAsync = ref.watch(animeDetailsProvider(slug));

    return Scaffold(
      backgroundColor: AppTheme.primaryBlack,
      body: detailsAsync.when(
        data: (data) => _buildContent(context, ref, data),
        loading: () => _buildShimmer(),
        error: (error, _) => _buildError(context, error.toString()),
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, dynamic data) {
    final anime = data['anime'];
    final episodes = data['episodes'] as List<<dynamic>;
    final userData = data['userData'];

    return CustomScrollView(
      slivers: [
        // Hero Image App Bar
        SliverAppBar(
          expandedHeight: 400,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                CachedNetworkImage(
                  imageUrl: anime['bannerImage'] ?? anime['coverImage'],
                  fit: BoxFit.cover,
                ),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        AppTheme.primaryBlack.withOpacity(0.8),
                        AppTheme.primaryBlack,
                      ],
                      stops: const [0.3, 0.7, 1.0],
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.share_outlined),
              onPressed: () {
                // Share functionality
              },
            ),
            IconButton(
              icon: Icon(
                userData?['isFavorite'] == true
                    ? Icons.bookmark
                    : Icons.bookmark_border,
                color: userData?['isFavorite'] == true
                    ? AppTheme.primaryOrange
                    : Colors.white,
              ),
              onPressed: () async {
                // Toggle favorite
              },
            ),
          ],
        ),

        // Content
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title & Meta
                FadeInUp(
                  child: Text(
                    anime['title'],
                    style: Theme.of(context).textTheme.displayMedium,
                  ),
                ),
                const SizedBox(height: 12),
                FadeInUp(
                  delay: const Duration(milliseconds: 100),
                  child: Row(
                    children: [
                      _buildMetaChip('${anime['averageRating']?.toStringAsFixed(1)} ★'),
                      const SizedBox(width: 8),
                      _buildMetaChip(anime['type']?.toUpperCase()),
                      const SizedBox(width: 8),
                      _buildMetaChip('${anime['episodesCount']} EPS'),
                      const SizedBox(width: 8),
                      _buildMetaChip(anime['status']),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Action Buttons
                FadeInUp(
                  delay: const Duration(milliseconds: 200),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: ElevatedButton.icon(
                          onPressed: episodes.isNotEmpty
                              ? () => context.push(
                                  '/watch/$slug/${episodes.first['number']}',
                                )
                              : null,
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Watch Now'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            // Add to list
                          },
                          icon: const Icon(Icons.add),
                          label: const Text('My List'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white38),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Synopsis
                FadeInUp(
                  delay: const Duration(milliseconds: 300),
                  child: Text(
                    'Synopsis',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                const SizedBox(height: 8),
                FadeInUp(
                  delay: const Duration(milliseconds: 400),
                  child: Text(
                    anime['synopsis'] ?? 'No synopsis available.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
                const SizedBox(height: 24),

                // Genres
                if (anime['genres'] != null && (anime['genres'] as List).isNotEmpty) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: (anime['genres'] as List).map<<Widget>((genre) {
                      return Chip(
                        label: Text(
                          genre['name'],
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                        backgroundColor: AppTheme.cardBlack,
                        side: BorderSide(
                          color: Color(int.parse(
                            genre['color']?.replaceFirst('#', '0xFF') ?? '0xFFFF6B00',
                          )),
                        ),
                        padding: EdgeInsets.zero,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                ],

                // Episodes Section
                FadeInUp(
                  delay: const Duration(milliseconds: 500),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Episodes',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        '${episodes.length} Episodes',
                        style: const TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),

        // Episode List
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final episode = episodes[index];
              final watchProgress = userData?['watchProgress']?[episode['_id']];
              
              return FadeInUp(
                delay: Duration(milliseconds: index * 30),
                child: EpisodeListItem(
                  episode: episode,
                  animeSlug: slug,
                  progress: watchProgress?['completionPercentage']?.toDouble(),
                  isCompleted: watchProgress?['completed'] ?? false,
                  onTap: () => context.push('/watch/$slug/${episode['number']}'),
                ),
              );
            },
            childCount: episodes.length,
          ),
        ),

        const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
      ],
    );
  }

  Widget _buildMetaChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.surfaceBlack,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: AppTheme.textSecondary,
        ),
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppTheme.surfaceBlack,
      highlightColor: AppTheme.cardBlack,
      child: Column(
        children: [
          Container(
            height: 400,
            color: AppTheme.surfaceBlack,
          ),
          Expanded(
            child: ListView.builder(
              itemCount: 5,
              itemBuilder: (_, __) => Container(
                height: 80,
                margin: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceBlack,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError(BuildContext context, String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: AppTheme.errorRed),
          const SizedBox(height: 16),
          Text(
            'Failed to load anime details',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.pop(),
            child: const Text('Go Back'),
          ),
        ],
      ),
    );
  }
}
