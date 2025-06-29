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
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700/50 backdrop-blur-sm">
      {/* Main Controls */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-t-2xl">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 0}
              className="group p-3 rounded-full bg-white/90 hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-600 shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              <SkipPrevious className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isCurrentLoading}
              className="group p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 disabled:hover:scale-100 ring-4 ring-blue-500/20"
            >
              {isCurrentLoading ? (
                <div className="animate-spin rounded-full h-7 w-7 border-3 border-white border-t-transparent"></div>
              ) : isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <PlayArrow className="w-7 h-7" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === enhancedParagraphs.length - 1}
              className="group p-3 rounded-full bg-white/90 hover:bg-white dark:bg-slate-700/90 dark:hover:bg-slate-600 shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100"
            >
              <SkipNext className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>

            <button
              onClick={handleSpeedClick}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ring-2 ring-emerald-500/20"
            >
              {playbackSpeed}×
            </button>
          </div>

          {/* Right: Progress Info */}
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              {currentParagraphIndex + 1} / {enhancedParagraphs.length}
            </span>
            {duration > 0 && (
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {duration > 0 && (
          <div className="mt-6">
            <div
              className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 rounded-full cursor-pointer relative overflow-hidden shadow-inner group"
              onClick={handleSeek}
            >
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full transition-all duration-300 shadow-lg group-hover:shadow-xl"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              >
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {currentError && (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-800/50 rounded-xl shadow-lg backdrop-blur-sm">
            <p className="text-red-700 dark:text-red-400 text-sm font-medium">{currentError}</p>
          </div>
        )}
      </div>

      {/* Voice Controls */}
      <div className="p-6 bg-gradient-to-r from-gray-50/80 to-blue-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              Narrator Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white/90 dark:bg-slate-800/90 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm font-medium"
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

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              Dialogue Voice
            </label>
            <select
              value={dialogueVoice}
              onChange={(e) => handleDialogueVoiceChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl bg-white/90 dark:bg-slate-800/90 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm font-medium"
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
      <div className="p-6 border-t border-gray-100 dark:border-slate-700/50 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-slate-800/60 dark:to-slate-900/60 backdrop-blur-sm rounded-b-2xl">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
          Current Paragraph
        </h3>
        <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-xl text-sm text-gray-700 dark:text-gray-300 max-h-36 overflow-y-auto shadow-inner backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 font-medium leading-relaxed">
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
