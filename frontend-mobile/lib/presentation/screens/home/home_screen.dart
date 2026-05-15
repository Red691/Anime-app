// lib/presentation/screens/home/home_screen.dart
import 'package:animate_do/animate_do.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../../config/theme.dart';
import '../../providers/anime_provider.dart';
import '../../widgets/anime_card.dart';
import '../../widgets/section_header.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<<HomeScreen> {
  int _bannerIndex = 0;

  @override
  Widget build(BuildContext context) {
    final trendingAsync = ref.watch(trendingAnimeProvider);
    final latestAsync = ref.watch(latestEpisodesProvider);
    final popularAsync = ref.watch(popularAnimeProvider);
    final continueAsync = ref.watch(continueWatchingProvider);

    return Scaffold(
      backgroundColor: AppTheme.primaryBlack,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // App Bar
          SliverAppBar(
            floating: true,
            snap: true,
            title: Row(
              children: [
                Image.asset(
                  'assets/images/logo.png',
                  height: 32,
                  errorBuilder: (_, __, ___) => const Text(
                    'ANIMESTREAM',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryOrange,
                      fontSize: 20,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.cast, color: Colors.white),
                onPressed: () {
                  // Chromecast logic
                },
              ),
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Colors.white),
                onPressed: () => context.push('/notifications'),
              ),
              const SizedBox(width: 8),
            ],
          ),

          // Featured Banner (Hero Section)
          SliverToBoxAdapter(
            child: trendingAsync.when(
              data: (animeList) => _buildFeaturedBanner(animeList.take(5).toList()),
              loading: () => _buildBannerShimmer(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),

          // Continue Watching
          SliverToBoxAdapter(
            child: continueAsync.when(
              data: (history) => history.isNotEmpty
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SectionHeader(title: 'Continue Watching'),
                        SizedBox(
                          height: 180,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: history.length,
                            itemBuilder: (context, index) {
                              final item = history[index];
                              return _ContinueWatchingCard(item: item);
                            },
                          ),
                        ),
                      ],
                    )
                  : const SizedBox.shrink(),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),

          // Trending Now
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Trending Now'),
                trendingAsync.when(
                  data: (animeList) => _buildHorizontalList(animeList),
                  loading: () => _buildHorizontalShimmer(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),

          // Latest Episodes
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Latest Episodes'),
                latestAsync.when(
                  data: (episodes) => _buildEpisodeList(episodes),
                  loading: () => _buildHorizontalShimmer(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),

          // Popular Anime
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Popular This Season'),
                popularAsync.when(
                  data: (animeList) => _buildHorizontalList(animeList),
                  loading: () => _buildHorizontalShimmer(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ],
            ),
          ),

          // Genres Grid
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Browse by Genre'),
                _buildGenreGrid(),
              ],
            ),
          ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
        ],
      ),
    );
  }

  Widget _buildFeaturedBanner(List<<dynamic> animeList) {
    if (animeList.isEmpty) return const SizedBox.shrink();

    return Stack(
      children: [
        CarouselSlider(
          options: CarouselOptions(
            height: 500,
            viewportFraction: 1.0,
            enlargeCenterPage: false,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 6),
            onPageChanged: (index, reason) {
              setState(() => _bannerIndex = index);
            },
          ),
          items: animeList.map((anime) {
            return Builder(
              builder: (context) {
                return GestureDetector(
                  onTap: () => context.push('/anime/${anime['slug']}'),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Background Image with gradient overlay
                      CachedNetworkImage(
                        imageUrl: anime['bannerImage'] ?? anime['coverImage'],
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: AppTheme.surfaceBlack),
                        errorWidget: (_, __, ___) => Container(color: AppTheme.surfaceBlack),
                      ),
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              AppTheme.primaryBlack.withOpacity(0.3),
                              AppTheme.primaryBlack.withOpacity(0.9),
                            ],
                            stops: const [0.3, 0.6, 1.0],
                          ),
                        ),
                      ),
                      // Content
                      Positioned(
                        bottom: 60,
                        left: 20,
                        right: 20,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            FadeInUp(
                              duration: const Duration(milliseconds: 500),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryOrange,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  'TRENDING #1',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            FadeInUp(
                              delay: const Duration(milliseconds: 100),
                              child: Text(
                                anime['title'],
                                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                  fontSize: 28,
                                  shadows: [
                                    Shadow(
                                      color: Colors.black.withOpacity(0.5),
                                      blurRadius: 10,
                                    ),
                                  ],
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(height: 8),
                            FadeInUp(
                              delay: const Duration(milliseconds: 200),
                              child: Row(
                                children: [
                                  Text(
                                    '${anime['averageRating']?.toStringAsFixed(1) ?? '0.0'} ★',
                                    style: const TextStyle(
                                      color: AppTheme.accentOrange,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    anime['type']?.toUpperCase() ?? 'TV',
                                    style: const TextStyle(
                                      color: AppTheme.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  if (anime['episodesCount'] != null)
                                    Text(
                                      '${anime['episodesCount']} EPS',
                                      style: const TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 12,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            FadeInUp(
                              delay: const Duration(milliseconds: 300),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () => context.push(
                                        '/watch/${anime['slug']}/1',
                                      ),
                                      icon: const Icon(Icons.play_arrow),
                                      label: const Text('Watch Now'),
                                      style: ElevatedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(vertical: 14),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Container(
                                    decoration: BoxDecoration(
                                      color: AppTheme.surfaceBlack.withOpacity(0.8),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.2),
                                      ),
                                    ),
                                    child: IconButton(
                                      icon: const Icon(Icons.add, color: Colors.white),
                                      onPressed: () {
                                        // Add to favorites
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    decoration: BoxDecoration(
                                      color: AppTheme.surfaceBlack.withOpacity(0.8),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.2),
                                      ),
                                    ),
                                    child: IconButton(
                                      icon: const Icon(Icons.info_outline, color: Colors.white),
                                      onPressed: () => context.push('/anime/${anime['slug']}'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          }).toList(),
        ),
        // Page Indicator
        Positioned(
          bottom: 20,
          left: 0,
          right: 0,
          child: Center(
            child: AnimatedSmoothIndicator(
              activeIndex: _bannerIndex,
              count: animeList.length,
              effect: const WormEffect(
                dotWidth: 8,
                dotHeight: 8,
                activeDotColor: AppTheme.primaryOrange,
                dotColor: Colors.white38,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHorizontalList(List<<dynamic> animeList) {
    return SizedBox(
      height: 220,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: animeList.length,
        itemBuilder: (context, index) {
          final anime = animeList[index];
          return FadeInRight(
            delay: Duration(milliseconds: index * 50),
            child: AnimeCard(
              anime: anime,
              onTap: () => context.push('/anime/${anime['slug']}'),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEpisodeList(List<<dynamic> episodes) {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: episodes.length,
        itemBuilder: (context, index) {
          final episode = episodes[index];
          final anime = episode['anime'];
          return GestureDetector(
            onTap: () => context.push('/watch/${anime['slug']}/${episode['number']}'),
            child: Container(
              width: 280,
              margin: const EdgeInsets.only(right: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Stack(
                      children: [
                        CachedNetworkImage(
                          imageUrl: episode['thumbnail'] ?? anime['coverImage'],
                          height: 150,
                          width: 280,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                            color: AppTheme.surfaceBlack,
                            height: 150,
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              'EP ${episode['number']}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    anime['title'],
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    episode['title'] ?? 'Episode ${episode['number']}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildGenreGrid() {
    final genres = [
      {'name': 'Action', 'color': 0xFFE50914},
      {'name': 'Adventure', 'color': 0xFF46D369},
      {'name': 'Romance', 'color': 0xFFFF6B99},
      {'name': 'Fantasy', 'color': 0xFF9B59B6},
      {'name': 'Sci-Fi', 'color': 0xFF3498DB},
      {'name': 'Horror', 'color': 0xFF2C3E50},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 2.5,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: genres.length,
        itemBuilder: (context, index) {
          final genre = genres[index];
          return GestureDetector(
            onTap: () {
              // Navigate to genre filter
            },
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: LinearGradient(
                  colors: [
                    Color(genre['color'] as int).withOpacity(0.8),
                    Color(genre['color'] as int).withOpacity(0.4),
                  ],
                ),
              ),
              child: Center(
                child: Text(
                  genre['name'] as String,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBannerShimmer() {
    return Shimmer.fromColors(
      baseColor: AppTheme.surfaceBlack,
      highlightColor: AppTheme.cardBlack,
      child: Container(
        height: 500,
        color: AppTheme.surfaceBlack,
      ),
    );
  }

  Widget _buildHorizontalShimmer() {
    return SizedBox(
      height: 220,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: 5,
        itemBuilder: (_, __) => Container(
          width: 140,
          margin: const EdgeInsets.only(right: 12),
          decoration: BoxDecoration(
            color: AppTheme.surfaceBlack,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

// Continue Watching Card
class _ContinueWatchingCard extends StatelessWidget {
  final dynamic item;

  const _ContinueWatchingCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final anime = item['anime'];
    final episode = item['episode'];
    final progress = item['completionPercentage'] as double? ?? 0.0;

    return GestureDetector(
      onTap: () => context.push('/watch/${anime['slug']}/${episode['number']}'),
      child: Container(
        width: 280,
        margin: const EdgeInsets.only(right: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  CachedNetworkImage(
                    imageUrl: episode['thumbnail'] ?? anime['coverImage'],
                    height: 150,
                    width: 280,
                    fit: BoxFit.cover,
                  ),
                  // Progress bar overlay
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: LinearProgressIndicator(
                      value: progress / 100,
                      backgroundColor: Colors.black.withOpacity(0.5),
                      valueColor: const AlwaysStoppedAnimation<<Color>(AppTheme.primaryOrange),
                      minHeight: 3,
                    ),
                  ),
                  // Resume icon
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.play_arrow,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              anime['title'],
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: AppTheme.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              'EP ${episode['number']} • ${progress.toStringAsFixed(0)}% watched',
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
