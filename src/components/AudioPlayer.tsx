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
  MIN_CHARACTERS,
} from "../utils/audioPlayerUtils";
import {
  SkipPrevious,
  PlayArrow,
  Pause,
  SkipNext,
  Close,
} from "@mui/icons-material";

interface AudioPlayerProps {
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
  onParagraphChange: (index: number) => void;
  onClose: () => void;
  isVisible: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  paragraphs,
  currentParagraphIndex,
  onParagraphChange,
  onClose,
  isVisible,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_NARRATOR_VOICE);
  const [dialogueVoice, setDialogueVoice] = useState(DEFAULT_DIALOGUE_VOICE);
  const [playbackSpeed, setPlaybackSpeed] = useState(SPEED_OPTIONS[2].value);
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
        updateParagraphInList(prev, index, updates),
      );
    },
    [],
  );

  // Lazy load audio for a specific paragraph
  const lazyLoadAudio = useCallback(
    async (index: number) => {
      if (index < 0) return;

      // Use ref to get the most up-to-date paragraph state
      const currentParagraph = enhancedParagraphsRef.current[index];

      // Check if already loading or loaded to prevent duplicate calls
      if (
        !currentParagraph ||
        currentParagraph.audioBlob ||
        currentParagraph.isLoading ||
        loadingRef.current.has(index)
      ) {
        return;
      }

      // Mark as loading to prevent duplicates
      loadingRef.current.add(index);

      // Update state to show loading
      updateParagraph(index, { isLoading: true, errors: null });

      try {
        const result = await generateAudioForParagraph(
          currentParagraph,
          selectedVoice,
          dialogueVoice,
        );

        if (result.success && result.audioBlob) {
          updateParagraph(index, {
            audioData: null, // We don't store blob URLs anymore
            audioBlob: result.audioBlob,
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
        // Remove from loading set when done
        loadingRef.current.delete(index);
      }
    },
    [selectedVoice, dialogueVoice, updateParagraph],
  );

  // Lazy load audio for current paragraph and preload upcoming ones
  useEffect(() => {
    if (enhancedParagraphs.length > 0 && currentParagraphIndex >= 0) {
      // Reset audio element when paragraph changes
      if (audioRef.current) {
        audioRef.current.pause();
        // Revoke the blob URL if it exists
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
        setIsPlaying(false);
      }

      // Reset progress tracking
      setCurrentTime(0);
      setDuration(0);

      // Load current paragraph audio immediately
      lazyLoadAudio(currentParagraphIndex);

      // Preload upcoming paragraphs up to MIN_CHARACTERS
      let totalCharacters = 0;
      for (
        let i = currentParagraphIndex + 1;
        i < enhancedParagraphs.length && totalCharacters < MIN_CHARACTERS;
        i++
      ) {
        totalCharacters += enhancedParagraphsRef.current[i].text.length;
        lazyLoadAudio(i);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParagraphIndex, enhancedParagraphs.length, lazyLoadAudio]);

  // Update playback speed when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
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
        handlePlay();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedParagraphs, currentParagraphIndex, playbackSpeed]);

  const handlePlay = async () => {
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (!currentParagraph || !audioRef.current) {
      return;
    }

    // If audio blob is not available yet, just return (audio should be loading from useEffect)
    if (!currentParagraph.audioBlob) {
      return;
    }

    try {
      const audio = audioRef.current;
      
      // Create a fresh blob URL from the stored blob to ensure it's valid
      if (currentParagraph.audioBlob) {
        // Revoke the old URL if it exists
        if (audio.src && audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        
        // Create a new blob URL from the stored blob
        const freshBlobUrl = URL.createObjectURL(currentParagraph.audioBlob);
        
        audio.src = freshBlobUrl;
        
        // Wait for the audio to be ready to play
        await new Promise<void>((resolve, reject) => {
          const handleCanPlay = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadeddata', handleLoadedData);
            resolve();
          };
          
          const handleLoadedData = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadeddata', handleLoadedData);
            resolve();
          };
          
          const handleError = (event: Event) => {
            console.error("Audio loading error:", event);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadeddata', handleLoadedData);
            reject(new Error('Audio failed to load'));
          };
          
          // If audio is already ready, resolve immediately
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
            resolve();
            return;
          }
          
          audio.addEventListener('canplay', handleCanPlay);
          audio.addEventListener('loadeddata', handleLoadedData);
          audio.addEventListener('error', handleError);
          
          // Load the audio
          audio.load();
        });
      }

      // Ensure playback speed is set correctly
      audio.playbackRate = playbackSpeed;
      
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      updateParagraph(currentParagraphIndex, {
        errors: "Failed to play audio. Please try again.",
      });
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    if (currentParagraphIndex > 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        // Revoke the blob URL if it exists
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
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
        audioRef.current.pause();
        // Revoke the blob URL if it exists
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onParagraphChange(currentParagraphIndex + 1);

      // Mark for auto-play if was playing
      if (wasPlaying) {
        const playButton = document.querySelector(
          '[data-testid="play-button"]',
        );
        if (playButton) {
          playButton.setAttribute("data-auto-play", "true");
        }
      }
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (audioRef.current) {
      audioRef.current.pause();
      // Revoke the blob URL if it exists
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Clear loading tracking and audio data for all paragraphs so they regenerate with new voice
    loadingRef.current.clear();
    setEnhancedParagraphs((prev) => clearAudioDataForVoiceChange(prev));
  };

  const handleDialogueVoiceChange = (voice: string) => {
    setDialogueVoice(voice);
    if (audioRef.current) {
      audioRef.current.pause();
      // Revoke the blob URL if it exists
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Clear loading tracking and audio data for all paragraphs so they regenerate with new voice
    loadingRef.current.clear();
    setEnhancedParagraphs((prev) => clearAudioDataForVoiceChange(prev));
  };

  const handleSpeedClick = () => {
    setPlaybackSpeed(calculateNextSpeed(playbackSpeed));
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
        defaultPosition={{ x: 20, y: 100 }}
        nodeRef={nodeRef}
      >
        <div
          ref={nodeRef}
          className="absolute bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-2 border-primary-500/30 rounded-xl shadow-2xl shadow-primary-500/20 z-50 pointer-events-auto transition-all duration-300 backdrop-blur-xl w-80 hover:shadow-primary-500/30 hover:border-primary-500/50"
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
              // Revoke the current blob URL since we're done with it
              if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
                audioRef.current.src = "";
              }
              // Auto-advance to next paragraph when current one finishes
              if (currentParagraphIndex < enhancedParagraphs.length - 1) {
                handleNext();
              }
            }}
          />
        </div>
      </Draggable>
    </div>
  );
};

export default AudioPlayer;
