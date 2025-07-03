import React, { useState, useEffect, useRef, useCallback } from "react";
import Draggable from "react-draggable";
import { Paragraph, EnhancedParagraph, VoiceOption } from "../types";
import {
  SPEED_OPTIONS,
  DEFAULT_NARRATOR_VOICE,
  DEFAULT_DIALOGUE_VOICE,
  NARRATOR_VOICES,
  DIALOGUE_VOICES,
} from "../utils/config";
import {
  initializeEnhancedParagraphs,
  cleanupAudioUrls,
  clearAudioDataForVoiceChange,
  calculateNextSpeed,
  generateAudioForParagraph,
  updateParagraphInList,
  cleanupAudioOutsideRange,
  getParagraphsToLoad,
} from "../utils/audioPlayerUtils";
import {
  SkipPrevious,
  PlayArrow,
  Pause,
  SkipNext,
  Close,
  Replay,
} from "@mui/icons-material";

interface AudioPlayerProps {
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
  onParagraphChange: (index: number) => void;
  onClose: () => void;
  isVisible: boolean;
  onChapterComplete: () => void; // Callback when chapter is finished
  hasNextChapter: boolean; // Whether there's a next chapter available
  initialPlaybackSpeed?: number; // Initial playback speed
  initialNarratorVoice?: string; // Initial narrator voice
  initialDialogueVoice?: string; // Initial dialogue voice
  initialIsPlaying?: boolean; // Whether to start in playing state
  onSettingsChange?: (settings: {
    playbackSpeed: number;
    narratorVoice: string;
    dialogueVoice: string;
  }) => void; // Callback when settings change
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  paragraphs,
  currentParagraphIndex,
  onParagraphChange,
  onClose,
  isVisible,
  onChapterComplete,
  hasNextChapter,
  initialPlaybackSpeed = SPEED_OPTIONS[2].value,
  initialNarratorVoice = DEFAULT_NARRATOR_VOICE,
  initialDialogueVoice = DEFAULT_DIALOGUE_VOICE,
  initialIsPlaying = false,
  onSettingsChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [selectedVoice, setSelectedVoice] = useState(initialNarratorVoice);
  const [dialogueVoice, setDialogueVoice] = useState(initialDialogueVoice);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialPlaybackSpeed);
  const [enhancedParagraphs, setEnhancedParagraphs] = useState<
    EnhancedParagraph[]
  >([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<Set<number>>(new Set()); // Track which paragraphs are currently loading

  const enhancedParagraphsRef = useRef(enhancedParagraphs);
  useEffect(() => {
    enhancedParagraphsRef.current = enhancedParagraphs;
  }, [enhancedParagraphs]);

  // Initialize enhanced paragraphs from basic paragraphs
  useEffect(() => {
    setEnhancedParagraphs(initializeEnhancedParagraphs(paragraphs));
  }, [paragraphs]);

  // Clean up audio URLs when component unmounts
  useEffect(() => {
    const currentAudioRef = audioRef.current;
    return () => {
      // Clean up the current audio source
      if (currentAudioRef?.src && currentAudioRef.src.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudioRef.src);
      }
      // Clean up all stored blob URLs
      cleanupAudioUrls(enhancedParagraphs);
    };
  }, [enhancedParagraphs]);

  // Helper function to update a specific paragraph
  const updateParagraph = useCallback(
    (index: number, updates: Partial<EnhancedParagraph>) => {
      setEnhancedParagraphs((prev) =>
        updateParagraphInList(prev, index, updates)
      );
    },
    []
  );

  // Aggressive audio preloading for seamless paragraph changes
  const preloadAudioRange = useCallback(
    async (centerIndex: number) => {
      const paragraphsToLoad = getParagraphsToLoad(
        enhancedParagraphsRef.current,
        centerIndex
      );

      // Load paragraphs in priority order (current first, then next ones until MIN_CHARACTERS)
      for (const index of paragraphsToLoad) {
        if (loadingRef.current.has(index)) {
          continue; // Skip if already loading
        }

        const currentParagraph = enhancedParagraphsRef.current[index];
        if (!currentParagraph || currentParagraph.audioBlob) {
          continue; // Skip if doesn't exist or already loaded
        }

        // Mark as loading to prevent duplicates
        loadingRef.current.add(index);
        updateParagraph(index, { isLoading: true, errors: null });

        try {
          const result = await generateAudioForParagraph(
            currentParagraph,
            selectedVoice,
            dialogueVoice
          );

          if (result.success && result.audioBlob && result.audioUrl) {
            updateParagraph(index, {
              audioData: null,
              audioBlob: result.audioBlob,
              audioUrl: result.audioUrl, // Store the URL for immediate use
              isLoading: false,
              errors: null,
            });
          } else {
            updateParagraph(index, {
              errors: result.error || "Failed to generate audio",
              isLoading: false,
            });
          }
        } catch (error) {
          updateParagraph(index, {
            errors: "Failed to generate audio",
            isLoading: false,
          });
        } finally {
          loadingRef.current.delete(index);
        }
      }

      // Clean up audio outside the preload range to save memory
      setEnhancedParagraphs((prev) =>
        cleanupAudioOutsideRange(prev, centerIndex)
      );
    },
    [selectedVoice, dialogueVoice, updateParagraph]
  );

  // Preload audio for current paragraph and adjacent ones
  useEffect(() => {
    if (enhancedParagraphs.length > 0 && currentParagraphIndex >= 0) {
      // Reset audio element when paragraph changes
      if (audioRef.current) {
        audioRef.current.pause();
        // Don't revoke URLs here as we'll reuse them
        audioRef.current.src = "";
        // Only set isPlaying to false if we're not in auto-advance mode
        if (!initialIsPlaying) {
          setIsPlaying(false);
        }
      }

      // Reset progress tracking
      setCurrentTime(0);
      setDuration(0);

      // Start aggressive preloading centered on current paragraph
      preloadAudioRange(currentParagraphIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParagraphIndex, enhancedParagraphs.length, preloadAudioRange]);

  // Update playback speed when changed
  useEffect(() => {
    if (audioRef.current) {
      try {
        // Only update playback rate if audio is in a valid state
        if (audioRef.current.readyState >= 1) {
          // HAVE_METADATA or better
          audioRef.current.playbackRate = playbackSpeed;
        }
      } catch (error) {
        console.warn("Failed to update playback speed:", error);
        // Don't throw error, just log warning as this is not critical
      }
    }
  }, [playbackSpeed]);

  // Add event listeners for progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, []);

  // Auto-play when audio becomes available after loading
  useEffect(() => {
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (currentParagraph?.audioBlob && !currentParagraph.isLoading) {
      // If user clicked play while audio was loading, start playing now
      const playButton = document.querySelector('[data-auto-play="true"]');
      if (playButton) {
        playButton.removeAttribute("data-auto-play");

        // Add a small delay to ensure audio element is ready after paragraph change
        setTimeout(() => {
          handlePlay();
        }, 100); // 100ms delay to allow audio element to settle
      } else if (initialIsPlaying && !isPlaying) {
        // If we should be playing (e.g., after chapter change) but aren't currently playing
        setTimeout(() => {
          handlePlay();
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedParagraphs, currentParagraphIndex, playbackSpeed]);

  const loadAndPlayAudio = useCallback(
    async (paragraph: EnhancedParagraph) => {
      if (!audioRef.current) {
        return;
      }

      const audio = audioRef.current;

      try {
        // Use the stored URL if available, otherwise create a new one
        let audioUrl = paragraph.audioUrl;
        if (!audioUrl && paragraph.audioBlob) {
          audioUrl = URL.createObjectURL(paragraph.audioBlob);
          // Update the paragraph with the new URL for future use
          const paragraphIndex = enhancedParagraphs.findIndex(
            (p) => p.paragraphNumber === paragraph.paragraphNumber
          );
          if (paragraphIndex >= 0) {
            updateParagraph(paragraphIndex, { audioUrl });
          }
        }

        if (!audioUrl) {
          throw new Error("No audio available");
        }

        // Only change source if it's different to avoid unnecessary loading
        if (audio.src !== audioUrl) {
          audio.src = audioUrl;
          audio.load();
        }

        audio.playbackRate = playbackSpeed;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Failed to play audio:", err);
        updateParagraph(currentParagraphIndex, {
          errors: "Failed to play audio. Please try again.",
        });
        setIsPlaying(false);
      }
    },
    [playbackSpeed, currentParagraphIndex, updateParagraph, enhancedParagraphs]
  );

  const handlePlay = async () => {
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (!currentParagraph || !audioRef.current) {
      return;
    }

    // If audio is loaded and paused, just resume playing
    if (audioRef.current.src && audioRef.current.paused && !isPlaying) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (error) {
        console.error("Failed to resume playback, will try reloading.", error);
        // Fallback to reloading if resume fails
      }
    }

    if (currentParagraph.audioBlob) {
      loadAndPlayAudio(currentParagraph);
    } else {
      // Audio is not loaded yet, trigger preloading for current range
      preloadAudioRange(currentParagraphIndex);
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    if (currentParagraphIndex > 0) {
      if (audioRef.current) {
        // Pause and reset position, but keep the source for potential reuse
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.playbackRate = playbackSpeed;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onParagraphChange(currentParagraphIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentParagraphIndex < enhancedParagraphs.length - 1) {
      const wasPlaying = isPlaying;
      if (audioRef.current) {
        // Pause and reset position, but keep the source for potential reuse
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.playbackRate = playbackSpeed;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onParagraphChange(currentParagraphIndex + 1);

      // Mark for auto-play if was playing
      if (wasPlaying) {
        const playButton = document.querySelector(
          '[data-testid="play-button"]'
        );
        if (playButton) {
          playButton.setAttribute("data-auto-play", "true");
        }
      }
    }
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);

      if (!isPlaying) {
        handlePlay();
      }
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear source to prevent stale audio
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Clear loading tracking and audio data for all paragraphs so they regenerate with new voice
    loadingRef.current.clear();
    setEnhancedParagraphs((prev) => clearAudioDataForVoiceChange(prev));

    // Notify parent of settings change
    if (onSettingsChange) {
      onSettingsChange({
        playbackSpeed,
        narratorVoice: voice,
        dialogueVoice,
      });
    }
  };

  const handleDialogueVoiceChange = (voice: string) => {
    setDialogueVoice(voice);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear source to prevent stale audio
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Clear loading tracking and audio data for all paragraphs so they regenerate with new voice
    loadingRef.current.clear();
    setEnhancedParagraphs((prev) => clearAudioDataForVoiceChange(prev));

    // Notify parent of settings change
    if (onSettingsChange) {
      onSettingsChange({
        playbackSpeed,
        narratorVoice: selectedVoice,
        dialogueVoice: voice,
      });
    }
  };

  const handleSpeedClick = () => {
    const newSpeed = calculateNextSpeed(playbackSpeed);
    setPlaybackSpeed(newSpeed);

    // Notify parent of settings change
    if (onSettingsChange) {
      onSettingsChange({
        playbackSpeed: newSpeed,
        narratorVoice: selectedVoice,
        dialogueVoice,
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!isVisible) return null;

  const currentParagraph = enhancedParagraphs[currentParagraphIndex];
  const isCurrentLoading = currentParagraph?.isLoading || false;
  const currentError = currentParagraph?.errors || null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <Draggable
        handle=".drag-handle"
        defaultPosition={{
          x: Math.max(
            20,
            (typeof window !== "undefined" ? window.innerWidth : 1200) - 450
          ),
          y: Math.max(
            20,
            (typeof window !== "undefined" ? window.innerHeight : 800) - 250
          ),
        }}
        nodeRef={nodeRef}
      >
        <div
          ref={nodeRef}
          className="absolute bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-2 border-primary-500/30 rounded-xl shadow-2xl shadow-primary-500/20 z-50 pointer-events-auto transition-all duration-300 backdrop-blur-xl w-96 hover:shadow-primary-500/30 hover:border-primary-500/50"
        >
          {/* Compact Header with Controls */}
          <div
            className="drag-handle cursor-move p-3 rounded-t-xl bg-gradient-to-r from-primary-600/20 to-accent-600/20 border-b border-primary-500/30"
            style={{
              background:
                "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(14, 165, 233, 0.15) 100%)",
            }}
          >
            <div className="flex items-center gap-2">
              {/* Play/Pause Button */}
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={isCurrentLoading}
                data-testid="play-button"
                className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-600 text-white disabled:opacity-50 rounded-lg flex items-center justify-center shadow-md hover:scale-105 transition-all"
              >
                {isCurrentLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent"></div>
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <PlayArrow className="w-4 h-4" />
                )}
              </button>

              {/* Replay Button */}
              <button
                onClick={handleReplay}
                disabled={isCurrentLoading || !currentParagraph?.audioBlob}
                className="w-7 h-7 bg-orange-500/80 hover:bg-orange-600/80 rounded-lg text-orange-100 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-all flex items-center justify-center border border-orange-400/50 hover:border-orange-300/70"
                title="Replay current paragraph"
              >
                <Replay className="w-4 h-4" />
              </button>

              {/* Previous/Next */}
              <button
                onClick={handlePrevious}
                disabled={currentParagraphIndex === 0}
                className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/80 rounded-lg text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-all flex items-center justify-center border border-slate-600/50 hover:border-slate-500/70"
              >
                <SkipPrevious className="w-4 h-4" />
              </button>

              <button
                onClick={handleNext}
                disabled={
                  currentParagraphIndex === enhancedParagraphs.length - 1
                }
                className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/80 rounded-lg text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-all flex items-center justify-center border border-slate-600/50 hover:border-slate-500/70"
              >
                <SkipNext className="w-4 h-4" />
              </button>

              {/* Speed Control */}
              <button
                onClick={handleSpeedClick}
                className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg text-xs font-bold min-w-[2.5rem] transition-all shadow-lg hover:shadow-emerald-500/30 border border-emerald-400/30"
              >
                {playbackSpeed}×
              </button>

              {/* Progress Info */}
              <div className="flex-1 text-center bg-slate-800/40 rounded-lg py-1 px-2 border border-slate-600/30">
                <div className="text-xs text-slate-200 font-semibold">
                  {currentParagraphIndex + 1}/{enhancedParagraphs.length}
                </div>
                {duration > 0 && (
                  <div className="text-xs text-slate-400">
                    {formatTime(currentTime)}/{formatTime(duration)}
                  </div>
                )}
              </div>

              {/* Expand/Settings Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 bg-slate-700/80 hover:bg-slate-600/80 rounded-lg text-slate-300 hover:text-white transition-all flex items-center justify-center border border-slate-600/50 hover:border-slate-500/70"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-7 h-7 bg-red-600/20 hover:bg-red-500/30 rounded-lg text-red-400 hover:text-red-300 transition-all flex items-center justify-center border border-red-500/30 hover:border-red-400/50"
              >
                <Close className="w-4 h-4" />
              </button>
            </div>

            {/* Compact Progress Bar */}
            {duration > 0 && (
              <div
                className="mt-2 h-2 bg-slate-800/60 rounded-full cursor-pointer relative overflow-hidden border border-slate-600/40"
                onClick={handleSeek}
              >
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 via-purple-500 to-accent-500 rounded-full transition-all shadow-lg"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            )}

            {/* Error Display */}
            {currentError && (
              <div className="mt-2 p-2 bg-red-500/30 border border-red-400/50 rounded-lg text-red-200 text-xs flex items-center gap-2 shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-300 animate-pulse"></div>
                <span className="flex-1 truncate">{currentError}</span>
              </div>
            )}
          </div>

          {/* Expandable Content */}
          {isExpanded && (
            <div className="p-3 border-t border-primary-500/30 bg-gradient-to-b from-slate-800/80 to-slate-900/80 rounded-b-xl">
              {/* Current Paragraph Preview */}
              <div className="mb-3 p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs text-slate-200 max-h-16 overflow-y-auto leading-relaxed shadow-inner">
                <div className="whitespace-pre-wrap">
                  {currentParagraph?.text || "No content available"}
                </div>
              </div>

              {/* Voice Controls - Single Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-primary-300 mb-1 font-semibold">
                    Narrator
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-700/80 border border-slate-600/60 rounded-lg text-white text-xs hover:border-primary-500/50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
                  >
                    <optgroup label="Male Voices">
                      {NARRATOR_VOICES.map((voice: VoiceOption) => (
                        <option
                          key={voice.value}
                          value={voice.value}
                          className="bg-slate-800"
                        >
                          {voice.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Female Voices">
                      {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                        <option
                          key={voice.value}
                          value={voice.value}
                          className="bg-slate-800"
                        >
                          {voice.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-accent-300 mb-1 font-semibold">
                    Dialogue
                  </label>
                  <select
                    value={dialogueVoice}
                    onChange={(e) => handleDialogueVoiceChange(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-700/80 border border-slate-600/60 rounded-lg text-white text-xs hover:border-accent-500/50 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30 transition-all"
                  >
                    <optgroup label="Female Voices">
                      {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                        <option
                          key={voice.value}
                          value={voice.value}
                          className="bg-slate-800"
                        >
                          {voice.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Male Voices">
                      {NARRATOR_VOICES.map((voice: VoiceOption) => (
                        <option
                          key={voice.value}
                          value={voice.value}
                          className="bg-slate-800"
                        >
                          {voice.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Hidden audio element with modern event handling */}
          <audio
            ref={audioRef}
            preload="none"
            className="hidden"
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);

              // Auto-advance to next paragraph when current one finishes
              if (currentParagraphIndex < enhancedParagraphs.length - 1) {
                // Let handleNext() handle the transition efficiently
                handleNext();
              } else {
                // We're at the last paragraph of the current chapter
                // Clear the audio source but don't revoke the URL (it's managed by our cleanup system)
                if (audioRef.current) {
                  audioRef.current.src = "";
                }

                // If there's a next chapter and callback is provided, trigger chapter change
                if (hasNextChapter && onChapterComplete) {
                  onChapterComplete();
                } else {
                  // No more chapters, just stop playback
                  setIsPlaying(false);
                  console.log("Audiobook finished - no more chapters");
                }
              }
            }}
          />
        </div>
      </Draggable>
    </div>
  );
};

export default AudioPlayer;
