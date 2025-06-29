import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "@mui/icons-material";

interface SimpleAudioPlayerProps {
  paragraphs: Paragraph[];
  currentParagraphIndex: number;
  onParagraphChange: (index: number) => void;
}

const SimpleAudioPlayer: React.FC<SimpleAudioPlayerProps> = ({
  paragraphs,
  currentParagraphIndex,
  onParagraphChange,
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadingRef = useRef<Set<number>>(new Set());

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
      if (currentAudioRef?.src && currentAudioRef.src.startsWith("blob:")) {
        URL.revokeObjectURL(currentAudioRef.src);
      }
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

      const currentParagraph = enhancedParagraphsRef.current[index];

      if (
        !currentParagraph ||
        currentParagraph.audioBlob ||
        currentParagraph.isLoading ||
        loadingRef.current.has(index)
      ) {
        return;
      }

      loadingRef.current.add(index);
      updateParagraph(index, { isLoading: true, errors: null });

      try {
        const result = await generateAudioForParagraph(
          currentParagraph,
          selectedVoice,
          dialogueVoice,
        );

        if (result.success && result.audioBlob) {
          updateParagraph(index, {
            audioData: null,
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
        loadingRef.current.delete(index);
      }
    },
    [selectedVoice, dialogueVoice, updateParagraph],
  );

  // Load audio when paragraph changes
  useEffect(() => {
    if (enhancedParagraphs.length > 0 && currentParagraphIndex >= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
        setIsPlaying(false);
      }

      setCurrentTime(0);
      setDuration(0);

      // Load current paragraph audio
      lazyLoadAudio(currentParagraphIndex);

      // Preload upcoming paragraphs
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
  }, [currentParagraphIndex, enhancedParagraphs.length, lazyLoadAudio]);

  // Update playback speed when changed
  useEffect(() => {
    if (audioRef.current && audioRef.current.readyState >= 1) {
      try {
        audioRef.current.playbackRate = playbackSpeed;
      } catch (error) {
        console.warn("Failed to update playback speed:", error);
      }
    }
  }, [playbackSpeed]);

  // Add event listeners for progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleDurationChange = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, []);

  const handlePlay = async () => {
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (!currentParagraph || !audioRef.current || !currentParagraph.audioBlob) {
      return;
    }

    try {
      const audio = audioRef.current;
      
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      audio.src = "";
      audio.currentTime = 0;
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const freshBlobUrl = URL.createObjectURL(currentParagraph.audioBlob);
      audio.src = freshBlobUrl;
      audio.playbackRate = playbackSpeed;
      
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          reject(new Error('Audio loading timeout'));
        }, 5000);
        
        const handleCanPlay = () => {
          clearTimeout(timeoutId);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = (event: Event) => {
          clearTimeout(timeoutId);
          console.error("Audio loading error:", event);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          reject(new Error('Audio failed to load'));
        };
        
        if (audio.readyState >= 2) {
          clearTimeout(timeoutId);
          resolve();
          return;
        }
        
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);
        audio.load();
      });

      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Failed to play audio:", err);
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
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onParagraphChange(currentParagraphIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentParagraphIndex < enhancedParagraphs.length - 1) {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = "";
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onParagraphChange(currentParagraphIndex + 1);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    loadingRef.current.clear();
    setEnhancedParagraphs((prev) => clearAudioDataForVoiceChange(prev));
  };

  const handleDialogueVoiceChange = (voice: string) => {
    setDialogueVoice(voice);
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
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

  const currentParagraph = enhancedParagraphs[currentParagraphIndex];
  const isCurrentLoading = currentParagraph?.isLoading || false;
  const currentError = currentParagraph?.errors || null;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
      {/* Main Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 0}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipPrevious className="w-5 h-5" />
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isCurrentLoading}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCurrentLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <PlayArrow className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === enhancedParagraphs.length - 1}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipNext className="w-5 h-5" />
            </button>

            <button
              onClick={handleSpeedClick}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {playbackSpeed}×
            </button>
          </div>

          {/* Right: Progress Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">
              {currentParagraphIndex + 1} / {enhancedParagraphs.length}
            </span>
            {duration > 0 && (
              <span className="ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {duration > 0 && (
          <div className="mt-4">
            <div
              className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full cursor-pointer relative overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {currentError && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{currentError}</p>
          </div>
        )}
      </div>

      {/* Voice Controls */}
      <div className="p-4 bg-gray-50 dark:bg-slate-900/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Narrator Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <optgroup label="Male Voices">
                {NARRATOR_VOICES.map((voice: VoiceOption) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Female Voices">
                {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dialogue Voice
            </label>
            <select
              value={dialogueVoice}
              onChange={(e) => handleDialogueVoiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <optgroup label="Female Voices">
                {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Male Voices">
                {NARRATOR_VOICES.map((voice: VoiceOption) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Current Paragraph Preview */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Current Paragraph
        </h3>
        <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
          {currentParagraph?.text || "No content available"}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
        onEnded={async () => {
          setIsPlaying(false);
          setCurrentTime(0);
          
          if (currentParagraphIndex < enhancedParagraphs.length - 1) {
            // Move to next paragraph
            const nextIndex = currentParagraphIndex + 1;
            onParagraphChange(nextIndex);
            
            // Auto-play the next paragraph after a short delay to ensure it loads
            setTimeout(async () => {
              const nextParagraph = enhancedParagraphsRef.current[nextIndex];
              if (nextParagraph?.audioBlob && audioRef.current) {
                try {
                  const audio = audioRef.current;
                  
                  if (audio.src && audio.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audio.src);
                  }
                  audio.src = "";
                  audio.currentTime = 0;
                  
                  const freshBlobUrl = URL.createObjectURL(nextParagraph.audioBlob);
                  audio.src = freshBlobUrl;
                  audio.playbackRate = playbackSpeed;
                  
                  await audio.play();
                  setIsPlaying(true);
                } catch (error) {
                  console.error("Failed to auto-play next paragraph:", error);
                }
              }
            }, 100);
          } else {
            if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
              URL.revokeObjectURL(audioRef.current.src);
              audioRef.current.src = "";
            }
          }
        }}
      />
    </div>
  );
};

export default SimpleAudioPlayer;
