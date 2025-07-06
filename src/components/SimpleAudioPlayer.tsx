import React, { useState, useEffect, useRef, useCallback } from "react";
import { Howl } from "howler";
import { Paragraph } from "../types";
import { generateAudioForParagraph, getPreloadRange } from "../utils/audioPlayerUtils";
import { DEFAULT_NARRATOR_VOICE, DEFAULT_DIALOGUE_VOICE, SPEED_OPTIONS } from "../utils/config";
import { PlayArrow, Pause, SkipNext, SkipPrevious } from "@mui/icons-material";

interface SimpleAudioPlayerProps {
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
  onParagraphChange: (index: number) => void;
  onClose: () => void;
  isVisible: boolean;
  narratorVoice?: string;
  dialogueVoice?: string;
}

interface AudioCache {
  [key: number]: {
    howl: Howl;
    isLoaded: boolean;
    isLoading: boolean;
    audioUrl?: string; // Store the blob URL for cleanup
  };
}

const SimpleAudioPlayer: React.FC<SimpleAudioPlayerProps> = ({
  paragraphs,
  currentParagraphIndex,
  onParagraphChange,
  onClose,
  isVisible,
  narratorVoice = DEFAULT_NARRATOR_VOICE,
  dialogueVoice = DEFAULT_DIALOGUE_VOICE,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pendingPlay, setPendingPlay] = useState(false); // Track if we should auto-play when audio loads
  
  const audioCache = useRef<AudioCache>({});
  const currentHowl = useRef<Howl | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const loadingTracker = useRef<Set<number>>(new Set()); // Track paragraphs currently being loaded

  // Clean up audio cache
  const cleanupAudioCache = useCallback(() => {
    Object.values(audioCache.current).forEach(({ howl, audioUrl }) => {
      howl.unload();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    });
    audioCache.current = {};
    loadingTracker.current.clear();
  }, []);

  // Load audio for a specific paragraph
  const loadParagraphAudio = useCallback(
    async (paragraphIndex: number): Promise<void> => {
      if (
        paragraphIndex < 0 ||
        paragraphIndex >= paragraphs.length ||
        audioCache.current[paragraphIndex]?.isLoaded ||
        loadingTracker.current.has(paragraphIndex) // Check if already loading
      ) {
        return;
      }

      const paragraph = paragraphs[paragraphIndex];
      if (!paragraph) return;

      // Mark as loading in both places
      loadingTracker.current.add(paragraphIndex);
      audioCache.current[paragraphIndex] = {
        howl: new Howl({ src: [""] }), // Placeholder
        isLoaded: false,
        isLoading: true,
      };

      try {
        // Generate audio using existing utility
        const enhancedParagraph = {
          ...paragraph,
          paragraphNumber: paragraphIndex,
          isLoading: false,
          audioData: null,
          audioBlob: null,
          errors: null,
        };
        
        const result = await generateAudioForParagraph(
          enhancedParagraph,
          narratorVoice,
          dialogueVoice
        );

        if (result.success && result.audioBlob && result.audioUrl) {
          const howl = new Howl({
            src: [result.audioUrl],
            format: ["mp3", "wav"],
            preload: true,
            onload: () => {
              if (audioCache.current[paragraphIndex]) {
                audioCache.current[paragraphIndex].isLoaded = true;
                audioCache.current[paragraphIndex].isLoading = false;
                audioCache.current[paragraphIndex].audioUrl = result.audioUrl;
              }
              loadingTracker.current.delete(paragraphIndex);
            },
            onloaderror: () => {
              console.error(`Failed to load audio for paragraph ${paragraphIndex}`);
              if (audioCache.current[paragraphIndex]) {
                audioCache.current[paragraphIndex].isLoading = false;
              }
              loadingTracker.current.delete(paragraphIndex);
            },
            onend: () => {
              setCurrentTime(0);
              
              // Auto-advance to next paragraph and keep playing
              if (paragraphIndex < paragraphs.length - 1) {
                // Keep playing state - the paragraph change effect will handle auto-play
                onParagraphChange(paragraphIndex + 1);
              } else {
                // End of all paragraphs, stop playing
                setIsPlaying(false);
              }
            },
          });

          audioCache.current[paragraphIndex] = {
            howl,
            isLoaded: false, // Will be set to true in onload callback
            isLoading: true,
            audioUrl: result.audioUrl,
          };
        } else {
          // Failed to generate audio
          loadingTracker.current.delete(paragraphIndex);
          if (audioCache.current[paragraphIndex]) {
            audioCache.current[paragraphIndex].isLoading = false;
          }
        }
      } catch (error) {
        console.error(`Failed to generate audio for paragraph ${paragraphIndex}:`, error);
        loadingTracker.current.delete(paragraphIndex);
        if (audioCache.current[paragraphIndex]) {
          audioCache.current[paragraphIndex].isLoading = false;
        }
      }
    },
    [paragraphs, narratorVoice, dialogueVoice, onParagraphChange]
  );

  // Preload paragraphs using intelligent range calculation
  const preloadAudio = useCallback(
    async (centerIndex: number) => {
      // Convert paragraphs to enhanced format for getPreloadRange
      const enhancedParagraphs = paragraphs.map((p, index) => ({
        paragraphNumber: index,
        text: p.text,
        isLoading: loadingTracker.current.has(index) || audioCache.current[index]?.isLoading || false,
        audioData: null,
        audioBlob: audioCache.current[index]?.isLoaded ? new Blob() : null, // Mock for range calculation
        errors: null,
        audioUrl: audioCache.current[index]?.audioUrl,
      }));

      // Get the range of paragraphs to preload
      const { start, end } = getPreloadRange(centerIndex, paragraphs.length, enhancedParagraphs);
      
      // Load current paragraph first (priority)
      if (!audioCache.current[centerIndex]?.isLoaded && !loadingTracker.current.has(centerIndex)) {
        await loadParagraphAudio(centerIndex);
      }
      
      // Load remaining paragraphs in parallel (excluding current paragraph)
      const loadPromises: Promise<void>[] = [];
      for (let i = start; i <= end; i++) {
        if (i !== centerIndex && !audioCache.current[i]?.isLoaded && !loadingTracker.current.has(i)) {
          loadPromises.push(loadParagraphAudio(i));
        }
      }
      
      if (loadPromises.length > 0) {
        // Don't await these - let them load in background
        Promise.all(loadPromises).catch(error => {
          console.warn('Background preloading failed:', error);
        });
      }
    },
    [loadParagraphAudio, paragraphs]
  );

  // Update progress
  const updateProgress = useCallback(() => {
    if (currentHowl.current && isPlaying) {
      const seek = currentHowl.current.seek();
      if (typeof seek === "number") {
        setCurrentTime(seek);
      }
    }
  }, [isPlaying]);

  // Start progress tracking
  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(updateProgress, 100);
  }, [updateProgress]);

  // Stop progress tracking
  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  // Play audio for current paragraph
  const handlePlay = useCallback(async () => {
    if (!isVisible) return;

    const cachedAudio = audioCache.current[currentParagraphIndex];
    
    if (cachedAudio?.isLoaded && cachedAudio.howl) {
      // Audio is ready, play it immediately
      currentHowl.current = cachedAudio.howl;
      setDuration(cachedAudio.howl.duration());
      cachedAudio.howl.rate(playbackSpeed);
      cachedAudio.howl.play();
      setIsPlaying(true);
      setPendingPlay(false);
      setIsLoading(false);
      startProgressTracking();
    } else if (!cachedAudio?.isLoading) {
      // Audio not loaded, start loading and set pending play
      setIsLoading(true);
      setIsPlaying(true); // Set playing state immediately
      setPendingPlay(true); // Mark that we want to play when ready
      await preloadAudio(currentParagraphIndex);
      
      // Check if audio is now ready after loading
      const updatedCachedAudio = audioCache.current[currentParagraphIndex];
      if (updatedCachedAudio?.isLoaded && updatedCachedAudio.howl) {
        currentHowl.current = updatedCachedAudio.howl;
        setDuration(updatedCachedAudio.howl.duration());
        updatedCachedAudio.howl.rate(playbackSpeed);
        updatedCachedAudio.howl.play();
        setIsPlaying(true);
        setPendingPlay(false);
        setIsLoading(false);
        startProgressTracking();
      }
    } else if (cachedAudio?.isLoading) {
      // Audio is currently loading, just set pending play
      setIsLoading(true);
      setIsPlaying(true);
      setPendingPlay(true);
    }
  }, [currentParagraphIndex, isVisible, preloadAudio, startProgressTracking, playbackSpeed]);

  // Pause audio
  const handlePause = useCallback(() => {
    if (currentHowl.current) {
      currentHowl.current.pause();
    }
    setIsPlaying(false);
    setPendingPlay(false);
    setIsLoading(false);
    stopProgressTracking();
  }, [stopProgressTracking]);

  // Previous paragraph
  const handlePrevious = useCallback(() => {
    if (currentParagraphIndex > 0) {
      const wasPlaying = isPlaying;
      if (currentHowl.current) {
        currentHowl.current.stop();
      }
      setCurrentTime(0);
      setDuration(0);
      stopProgressTracking();
      onParagraphChange(currentParagraphIndex - 1);
      
      // Keep playing state for auto-play after paragraph change
      if (wasPlaying) {
        setIsPlaying(true);
        setPendingPlay(true); // Set pending play for new paragraph
        setIsLoading(true); // Show loading state
      } else {
        setPendingPlay(false);
        setIsLoading(false);
      }
    }
  }, [currentParagraphIndex, onParagraphChange, stopProgressTracking, isPlaying]);

  // Next paragraph
  const handleNext = useCallback(() => {
    if (currentParagraphIndex < paragraphs.length - 1) {
      const wasPlaying = isPlaying;
      if (currentHowl.current) {
        currentHowl.current.stop();
      }
      setCurrentTime(0);
      setDuration(0);
      stopProgressTracking();
      onParagraphChange(currentParagraphIndex + 1);
      
      // Keep playing state for auto-play after paragraph change
      if (wasPlaying) {
        setIsPlaying(true);
        setPendingPlay(true); // Set pending play for new paragraph
        setIsLoading(true); // Show loading state
      } else {
        setPendingPlay(false);
        setIsLoading(false);
      }
    }
  }, [currentParagraphIndex, paragraphs.length, onParagraphChange, stopProgressTracking, isPlaying]);

  // Handle paragraph change
  useEffect(() => {
    if (currentHowl.current) {
      currentHowl.current.stop();
    }
    setCurrentTime(0);
    setDuration(0);
    stopProgressTracking();
    
    // Reset pending play if we're not in a playing state
    if (!isPlaying) {
      setPendingPlay(false);
      setIsLoading(false);
    }
    
    // Preload audio for new paragraph
    preloadAudio(currentParagraphIndex);
  }, [currentParagraphIndex, preloadAudio, stopProgressTracking, isPlaying]);

  // Auto-play effect for when paragraph changes and we should keep playing
  useEffect(() => {
    if (isPlaying) {
      // Small delay to allow audio to load after paragraph change
      const timer = setTimeout(() => {
        const cachedAudio = audioCache.current[currentParagraphIndex];
        if (cachedAudio?.isLoaded && cachedAudio.howl && !currentHowl.current?.playing()) {
          currentHowl.current = cachedAudio.howl;
          setDuration(cachedAudio.howl.duration());
          cachedAudio.howl.rate(playbackSpeed); // Set playback speed
          cachedAudio.howl.play();
          setPendingPlay(false);
          setIsLoading(false);
          startProgressTracking();
        } else if (!cachedAudio?.isLoaded) {
          // Audio is still loading (paragraph change effect already started the loading)
          // Just set pending play state and let the loading complete
          setPendingPlay(true);
          setIsLoading(true);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentParagraphIndex, startProgressTracking, playbackSpeed]);

  // Watch for audio becoming available when we have a pending play request
  useEffect(() => {
    if (pendingPlay && !isLoading) {
      const cachedAudio = audioCache.current[currentParagraphIndex];
      if (cachedAudio?.isLoaded && cachedAudio.howl) {
        currentHowl.current = cachedAudio.howl;
        setDuration(cachedAudio.howl.duration());
        cachedAudio.howl.rate(playbackSpeed);
        cachedAudio.howl.play();
        setIsPlaying(true);
        setPendingPlay(false);
        setIsLoading(false);
        startProgressTracking();
      }
    }
  }, [pendingPlay, isLoading, currentParagraphIndex, playbackSpeed, startProgressTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
      cleanupAudioCache();
    };
  }, [stopProgressTracking, cleanupAudioCache]);

  // Format time helper
  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Calculate next speed option
  const calculateNextSpeed = (currentSpeed: number) => {
    const speeds = SPEED_OPTIONS.map(option => option.value);
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    return speeds[nextIndex];
  };

  // Handle speed change
  const handleSpeedChange = useCallback(() => {
    const newSpeed = calculateNextSpeed(playbackSpeed);
    setPlaybackSpeed(newSpeed);
    
    // Update current playing audio's speed
    if (currentHowl.current && isPlaying) {
      currentHowl.current.rate(newSpeed);
    }
  }, [playbackSpeed, isPlaying]);

  // Update playback speed when audio loads
  useEffect(() => {
    if (currentHowl.current && playbackSpeed !== 1) {
      currentHowl.current.rate(playbackSpeed);
    }
  }, [playbackSpeed]);

  if (!isVisible) return null;

  const currentParagraph = paragraphs[currentParagraphIndex];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-primary-500/30 rounded-lg shadow-2xl p-4 w-96">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Simple Audio Player</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Current paragraph preview */}
        <div className="mb-3 p-2 bg-slate-700/50 rounded text-xs text-slate-300 max-h-16 overflow-y-auto relative">
          {currentParagraph?.text || "No content available"}
          {isLoading && isPlaying && (
            <div className="absolute top-1 right-1 flex items-center gap-1 bg-blue-600/80 text-white px-2 py-1 rounded text-xs">
              <div className="animate-spin rounded-full h-2 w-2 border border-white border-t-transparent"></div>
              Loading...
            </div>
          )}
        </div>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentParagraphIndex === 0}
            className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors"
          >
            <SkipPrevious className="w-5 h-5" />
          </button>

          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={false} // Never disable the button, let users pause even during loading
            className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-all shadow-lg"
          >
            {isLoading && isPlaying ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <PlayArrow className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentParagraphIndex === paragraphs.length - 1}
            className="w-10 h-10 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors"
          >
            <SkipNext className="w-5 h-5" />
          </button>
        </div>

        {/* Speed Control and Paragraph Counter */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={handleSpeedChange}
            className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-sm font-bold transition-all shadow-lg hover:shadow-emerald-500/30 border border-emerald-400/30"
          >
            {playbackSpeed}×
          </button>
          
          <div className="text-center text-xs text-slate-400">
            Paragraph {currentParagraphIndex + 1} of {paragraphs.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleAudioPlayer;
