// lib/presentation/screens/anime/episode_player_screen.dart
import 'package:better_player/better_player.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../../config/theme.dart';
import '../../../services/api_service.dart';
import '../../providers/player_provider.dart';

class EpisodePlayerScreen extends ConsumerStatefulWidget {
  final String animeSlug;
  final int episodeNumber;

  const EpisodePlayerScreen({
    super.key,
    required this.animeSlug,
    required this.episodeNumber,
  });

  @override
  ConsumerState<<EpisodePlayerScreen> createState() => _EpisodePlayerScreenState();
}

class _EpisodePlayerScreenState extends ConsumerState<<EpisodePlayerScreen> {
  BetterPlayerController? _betterPlayerController;
  bool _isLoading = true;
  bool _isFullscreen = false;
  Map<String, dynamic>? _episodeData;
  Map<String, dynamic>? _navigation;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable();
    _loadEpisode();
  }

  Future<void> _loadEpisode() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.getEpisode(widget.animeSlug, widget.episodeNumber);
      
      setState(() {
        _episodeData = response.data['data'];
        _navigation = _episodeData?['navigation'];
        _isLoading = false;
      });

      _initializePlayer();
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load episode: $e')),
        );
      }
    }
  }

  void _initializePlayer() {
    final episode = _episodeData?['episode'];
    if (episode == null) return;

    final servers = episode['servers'] as List<<dynamic>?;
    if (servers == null || servers.isEmpty) return;

    // Select best server (priority-based)
    final server = servers.firstWhere(
      (s) => s['isActive'] == true,
      orElse: () => servers.first,
    );

    final String videoUrl = server['url'];
    final List<<dynamic> qualities = server['quality'] ?? [];
    final List<<dynamic> subtitles = server['subtitles'] ?? [];

    // Build quality options
    final List<BetterPlayerDataSource> dataSourceList = [];
    if (qualities.isNotEmpty) {
      for (final quality in qualities) {
        dataSourceList.add(
          BetterPlayerDataSource(
            BetterPlayerDataSourceType.network,
            quality['url'],
            resolutions: {quality['label']: quality['url']},
          ),
        );
      }
    } else {
      dataSourceList.add(
        BetterPlayerDataSource(
          BetterPlayerDataSourceType.network,
          videoUrl,
        ),
      );
    }

    // Subtitle configuration
    final List<BetterPlayerSubtitlesSource> subtitleSources = subtitles.map((sub) {
      return BetterPlayerSubtitlesSource(
        type: BetterPlayerSubtitlesSourceType.network,
        name: sub['label'],
        urls: [sub['url']],
        selectedByDefault: sub['isDefault'] == true,
      );
    }).toList();

    final dataSource = BetterPlayerDataSource(
      BetterPlayerDataSourceType.network,
      videoUrl,
      subtitles: subtitleSources,
      notificationConfiguration: BetterPlayerNotificationConfiguration(
        showNotification: true,
        title: episode['title'],
        author: _episodeData?['anime']?['title'] ?? 'AnimeStream',
        imageUrl: episode['thumbnail'],
      ),
    );

    final config = BetterPlayerConfiguration(
      aspectRatio: 16 / 9,
      fit: BoxFit.contain,
      autoPlay: true,
      controlsConfiguration: BetterPlayerControlsConfiguration(
        enableSkips: true,
        skipBackIcon: Icons.replay_10,
        skipForwardIcon: Icons.forward_10,
        enableProgressBar: true,
        enableProgressBarDrag: true,
        enablePlayPause: true,
        enableMute: true,
        enableFullscreen: true,
        enableSubtitles: true,
        enableQualities: true,
        enableAudioTracks: false,
        progressBarPlayedColor: AppTheme.primaryOrange,
        progressBarHandleColor: AppTheme.primaryOrange,
        controlBarColor: Colors.black.withOpacity(0.7),
        iconsColor: Colors.white,
        showControlsOnInitialize: true,
        controlBarHeight: 48,
        liveTextColor: AppTheme.primaryOrange,
      ),
      bufferingConfiguration: BetterPlayerBufferingConfiguration(
        minBufferMs: 15000,
        maxBufferMs: 50000,
        bufferForPlaybackMs: 2500,
        bufferForPlaybackAfterRebufferMs: 5000,
      ),
    );

    _betterPlayerController = BetterPlayerController(config);
    _betterPlayerController?.setupDataSource(dataSource);

    // Resume from previous position
    final watchProgress = _episodeData?['watchProgress'];
    if (watchProgress != null && watchProgress['progress'] != null) {
      final progress = watchProgress['progress'] as int;
      final duration = watchProgress['duration'] as int? ?? 0;
      
      // Resume if not completed (>90%)
      if (duration > 0 && (progress / duration) < 0.9) {
        _betterPlayerController?.seekTo(Duration(seconds: progress));
      }
    }

    // Auto skip intro if enabled
    final introStart = episode['introStart'] as int?;
    final introEnd = episode['introEnd'] as int?;
    if (introStart != null && introEnd != null) {
      _betterPlayerController?.addEventsListener((event) {
        if (event.betterPlayerEventType == BetterPlayerEventType.progress) {
          final position = _betterPlayerController?.videoPlayerController?.value.position;
          if (position != null && 
              position.inSeconds >= introStart && 
              position.inSeconds < introEnd) {
            _betterPlayerController?.seekTo(Duration(seconds: introEnd));
          }
        }
      });
    }

    // Progress tracking
    _betterPlayerController?.addEventsListener((event) {
      if (event.betterPlayerEventType == BetterPlayerEventType.progress) {
        _updateProgress();
      }
      if (event.betterPlayerEventType == BetterPlayerEventType.finished) {
        _onEpisodeFinished();
      }
    });

    // Fullscreen listener
    _betterPlayerController?.addEventsListener((event) {
      if (event.betterPlayerEventType == BetterPlayerEventType.fullscreenChange) {
        setState(() {
          _isFullscreen = _betterPlayerController?.isFullScreen ?? false;
        });
      }
    });
  }

  Future<void> _updateProgress() async {
    if (_betterPlayerController == null || _episodeData == null) return;

    final position = _betterPlayerController?.videoPlayerController?.value.position;
    final duration = _betterPlayerController?.videoPlayerController?.value.duration;
    
    if (position == null || duration == null) return;

    // Update every 10 seconds
    if (position.inSeconds % 10 != 0) return;

    try {
      final api = ref.read(apiServiceProvider);
      await api.updateWatchProgress(
        _episodeData!['episode']['_id'],
        progress: position.inSeconds,
        duration: duration.inSeconds,
      );
    } catch (e) {
      // Silently fail - progress update is non-critical
    }
  }

  void _onEpisodeFinished() {
    final nextEpisode = _navigation?['next'];
    if (nextEpisode != null) {
      // Auto-play next episode after 5 seconds
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted && _episodeData?['user']?['preferences']?['autoNextEpisode'] != false) {
          // Navigate to next episode
        }
      });
    }
  }

  void _toggleFullscreen() {
    if (_isFullscreen) {
      _betterPlayerController?.exitFullScreen();
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);
    } else {
      _betterPlayerController?.enterFullScreen();
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    }
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    _betterPlayerController?.dispose();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final anime = _episodeData?['anime'];
    final episode = _episodeData?['episode'];

    return Scaffold(
      backgroundColor: Colors.black,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primaryOrange),
            )
          : Column(
              children: [
                // Video Player
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: _betterPlayerController != null
                      ? BetterPlayer(controller: _betterPlayerController!)
                      : Container(color: Colors.black),
                ),

                // Episode Info (only visible when not fullscreen)
                if (!_isFullscreen) ...[
                  Expanded(
                    child: Container(
                      color: AppTheme.primaryBlack,
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Title
                            Text(
                              '${anime?['title'] ?? ''} - EP ${episode?['number']}',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              episode?['title'] ?? 'Episode ${episode?['number']}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: 16),

                            // Navigation Buttons
                            Row(
                              children: [
                                if (_navigation?['previous'] != null)
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () {
                                        // Previous episode
                                      },
                                      icon: const Icon(Icons.skip_previous),
                                      label: const Text('Prev'),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: Colors.white,
                                        side: const BorderSide(color: Colors.white24),
                                      ),
                                    ),
                                  ),
                                if (_navigation?['previous'] != null && 
                                    _navigation?['next'] != null)
                                  const SizedBox(width: 12),
                                if (_navigation?['next'] != null)
                                  Expanded(
                                    child: ElevatedButton.icon(
                                      onPressed: () {
                                        // Next episode
                                      },
                                      icon: const Icon(Icons.skip_next),
                                      label: const Text('Next EP'),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            // Episode List
                            Text(
                              'All Episodes',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 12),
                            // Episode list would go here
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
