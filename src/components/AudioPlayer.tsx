import React, { useState, useEffect, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';
import { Paragraph, EnhancedParagraph, VoiceOption } from '../types';
import { SPEED_OPTIONS, DEFAULT_NARRATOR_VOICE, DEFAULT_DIALOGUE_VOICE, NARRATOR_VOICES, DIALOGUE_VOICES } from '../utils/config';
import {
  initializeEnhancedParagraphs,
  cleanupAudioUrls,
  clearAudioDataForVoiceChange,
  calculateNextSpeed,
  generateAudioForParagraph,
  updateParagraphInList,
  MIN_CHARACTERS
} from '../utils/audioPlayerUtils';
import {
  SkipPrevious,
  PlayArrow,
  Pause,
  SkipNext,
  Close
} from '@mui/icons-material';

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
  isVisible
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_NARRATOR_VOICE);
  const [dialogueVoice, setDialogueVoice] = useState(DEFAULT_DIALOGUE_VOICE);
  const [playbackSpeed, setPlaybackSpeed] = useState(SPEED_OPTIONS[2].value);
  const [enhancedParagraphs, setEnhancedParagraphs] = useState<EnhancedParagraph[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<Set<number>>(new Set()); // Track which paragraphs are currently loading

  // Initialize enhanced paragraphs from basic paragraphs
  useEffect(() => {
    setEnhancedParagraphs(initializeEnhancedParagraphs(paragraphs));
  }, [paragraphs]);

  // Clean up audio URLs when component unmounts
  useEffect(() => {
    const currentAudioRef = audioRef.current;
    return () => {
      // Clean up the current audio source
      if (currentAudioRef?.src && currentAudioRef.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudioRef.src);
      }
      // Clean up all stored blob URLs
      cleanupAudioUrls(enhancedParagraphs);
    };
  }, [enhancedParagraphs]);

  // Helper function to update a specific paragraph
  const updateParagraph = useCallback((index: number, updates: Partial<EnhancedParagraph>) => {
    setEnhancedParagraphs(prev => updateParagraphInList(prev, index, updates));
  }, []);

  // Lazy load audio for a specific paragraph
  const lazyLoadAudio = useCallback(async (index: number) => {
    console.log('Lazy loading audio for paragraph:', index);
    if (index < 0) return;
    
    // Check if already loading or loaded to prevent duplicate calls
    if (loadingRef.current.has(index)) {
      console.log('Skipping duplicate load for paragraph:', index);
      return;
    }
    
    // Use functional update to get current state to avoid stale closures
    const currentParagraph = enhancedParagraphs[index];
    
    if (!currentParagraph || currentParagraph.audioBlob || currentParagraph.isLoading) {
      return; // Already fetched or loading
    }
    
    console.log('Starting audio generation for paragraph:', index);
    
    // Mark as loading to prevent duplicates
    loadingRef.current.add(index);
    
    // Update state to show loading
    updateParagraph(index, { isLoading: true, errors: null });
    
    try {
      const result = await generateAudioForParagraph(
        currentParagraph,
        selectedVoice,
        dialogueVoice
      );
      
      if (result.success && result.audioUrl && result.audioBlob) {
        updateParagraph(index, { 
          audioData: result.audioUrl, 
          audioBlob: result.audioBlob,
          isLoading: false,
          errors: null 
        });
        console.log('Audio generated successfully for paragraph:', index);
      } else {
        updateParagraph(index, { 
          errors: result.error || 'Failed to generate audio',
          isLoading: false 
        });
        console.log('Audio generation failed for paragraph:', index, result.error);
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      updateParagraph(index, { 
        errors: 'Failed to generate audio',
        isLoading: false 
      });
    } finally {
      // Remove from loading set when done
      loadingRef.current.delete(index);
    }
  }, [enhancedParagraphs, selectedVoice, dialogueVoice, updateParagraph]);

  // Lazy load audio for current paragraph and preload upcoming ones
  useEffect(() => {
    if (enhancedParagraphs.length > 0 && currentParagraphIndex >= 0) {
      console.log('Triggering lazy load for paragraph:', currentParagraphIndex);
      
      // Reset audio element when paragraph changes
      if (audioRef.current) {
        audioRef.current.pause();
        // Clean up the previous blob URL when changing paragraphs
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = '';
        setIsPlaying(false);
      }
      
      // Reset progress tracking
      setCurrentTime(0);
      setDuration(0);
      
      // Load current paragraph audio immediately
      lazyLoadAudio(currentParagraphIndex);
      
      // Preload upcoming paragraphs up to MIN_CHARACTERS
      let totalCharacters = 0;
      for (let i = currentParagraphIndex + 1; i < enhancedParagraphs.length && totalCharacters < MIN_CHARACTERS; i++) {
        totalCharacters += enhancedParagraphs[i].text.length;
        lazyLoadAudio(i);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParagraphIndex, enhancedParagraphs.length]);

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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, []);

  // Auto-play when audio becomes available after loading
  useEffect(() => {
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (currentParagraph?.audioBlob && !currentParagraph.isLoading) {
      // Set up audio source when audio becomes available
      if (audioRef.current && !audioRef.current.src) {
        const audioUrl = URL.createObjectURL(currentParagraph.audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = playbackSpeed;
      }
      
      // If user clicked play while audio was loading, start playing now
      const playButton = document.querySelector('[data-auto-play="true"]');
      if (playButton) {
        playButton.removeAttribute('data-auto-play');
        handlePlay();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedParagraphs, currentParagraphIndex, playbackSpeed]);

  const handlePlay = async () => {
    console.log('Attempting to play audio for paragraph:', currentParagraphIndex);
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (!currentParagraph) return;

    // If audio blob is not available yet, just return (audio should be loading from useEffect)
    if (!currentParagraph.audioBlob) {
      console.log('Audio blob not ready yet for paragraph:', currentParagraphIndex, 'isLoading:', currentParagraph.isLoading);
      return;
    }

    // If we have audio blob data, set up the audio source (only if not already set)
    try {
      if (audioRef.current && currentParagraph.audioBlob) {
        // Only create a new blob URL if the audio source is empty or different
        if (!audioRef.current.src || !audioRef.current.src.startsWith('blob:')) {
          const freshAudioUrl = URL.createObjectURL(currentParagraph.audioBlob);
          console.log('Creating fresh blob URL:', freshAudioUrl);
          audioRef.current.src = freshAudioUrl;
        }
        
        audioRef.current.playbackRate = playbackSpeed;
        await audioRef.current.play();
        setIsPlaying(true);
        console.log('Playing audio for paragraph:', currentParagraphIndex);
      }
    } catch (err) {
      updateParagraph(currentParagraphIndex, { 
        errors: 'Failed to play audio. Please try again.'
      });
      console.error('Audio play error:', err);
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
        // Clean up the current blob URL to prevent memory leaks
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = '';
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
        // Clean up the current blob URL to prevent memory leaks
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = '';
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onParagraphChange(currentParagraphIndex + 1);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Clean up current audio source
    if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = '';
    }
    // Clear loading tracking and audio data for all paragraphs so they regenerate with new voice
    loadingRef.current.clear();
    setEnhancedParagraphs(prev => clearAudioDataForVoiceChange(prev));
  };

  const handleDialogueVoiceChange = (voice: string) => {
    setDialogueVoice(voice);
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Clean up current audio source
    if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = '';
    }
    // Clear loading tracking and audio data for all paragraphs so they regenerate with new voice
    loadingRef.current.clear();
    setEnhancedParagraphs(prev => clearAudioDataForVoiceChange(prev));
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
    if (!time || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        <div ref={nodeRef} className="absolute glass-dark border border-slate-700/50 rounded-2xl shadow-glow-lg z-50 min-w-[320px] max-w-[380px] pointer-events-auto transition-all duration-300 hover:shadow-glow-xl animate-fade-in-up backdrop-blur-xl">
        
        {/* Drag Handle - Styled with gradient */}
        <div className="drag-handle absolute top-0 left-0 right-0 h-4 cursor-move rounded-t-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 flex items-center justify-center">
          <div className="w-8 h-1 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full opacity-50"></div>
        </div>

        {/* Error Display */}
        {currentError && (
          <div className="mx-4 mt-6 p-3 glass border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2 animate-shake">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse-glow"></div>
            <span className="flex-1">{currentError}</span>
          </div>
        )}

        {/* Modern Header */}
        <div className="p-4 border-b border-slate-700/30 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Audio Player</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-primary-300 bg-primary-500/20 px-2 py-1 rounded-full border border-primary-500/30">
                    {currentParagraphIndex + 1}/{enhancedParagraphs.length}
                  </span>
                  <span className="text-xs text-slate-400">Paragraph</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 glass rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-white transition-all duration-300 focus-ring group"
            >
              <Close className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            </button>
          </div>
          
          {/* Current Paragraph Preview */}
          <div className="glass p-3 rounded-xl border border-slate-600/30">
            <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
              {currentParagraph?.text?.slice(0, 120) || 'No content available'}...
            </p>
          </div>
        </div>

        {/* Progress Bar Section */}
        {(currentTime > 0 || duration > 0) && (
          <div className="px-4 py-3 border-b border-slate-700/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div 
                className="h-2 bg-slate-800 rounded-full cursor-pointer relative overflow-hidden group"
                onClick={handleSeek}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full"></div>
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300 shadow-glow"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
                <div 
                  className="absolute top-1/2 w-4 h-4 bg-white rounded-full shadow-glow transform -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Controls */}
        <div className="p-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 0}
              className="p-3 glass rounded-xl text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-500/20 hover:text-white transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-md hover:shadow-glow focus-ring btn-modern"
            >
              <SkipPrevious className="w-5 h-5" />
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isCurrentLoading}
              className="p-4 bg-gradient-to-br from-primary-500 to-accent-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-primary-600 hover:to-accent-700 transition-all duration-300 hover:scale-105 shadow-glow hover:shadow-glow-lg rounded-2xl btn-modern relative overflow-hidden"
            >
              {isCurrentLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <PlayArrow className="w-6 h-6" />
              )}
              <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
            </button>

            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === enhancedParagraphs.length - 1}
              className="p-3 glass rounded-xl text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-500/20 hover:text-white transition-all duration-300 hover:scale-105 disabled:hover:scale-100 shadow-md hover:shadow-glow focus-ring btn-modern"
            >
              <SkipNext className="w-5 h-5" />
            </button>

            <button
              onClick={handleSpeedClick}
              className="px-4 py-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 hover:scale-105 shadow-glow hover:shadow-glow-lg rounded-xl text-sm font-bold min-w-[3.5rem] btn-modern relative overflow-hidden"
            >
              <span className="relative z-10">{playbackSpeed}×</span>
              <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
            </button>
          </div>

          {/* Voice Controls - Modern Glass Cards */}
          <div className="space-y-3">
            <div className="glass p-3 rounded-xl border border-slate-600/30">
              <label className="block text-xs font-semibold text-primary-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
                Narrator Voice
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full px-3 py-2 glass border border-slate-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 shadow-md hover:shadow-glow focus-ring bg-transparent backdrop-blur-sm"
              >
                <optgroup label="👨 Male Voices (Recommended for Narration)">
                  {NARRATOR_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value} className="bg-slate-800 text-white">
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👩 Female Voices">
                  {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value} className="bg-slate-800 text-white">
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="glass p-3 rounded-xl border border-slate-600/30">
              <label className="block text-xs font-semibold text-accent-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 9h6v6h-6z"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7 12c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm10 0c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z"/>
                </svg>
                Dialogue Voice
              </label>
              <select
                value={dialogueVoice}
                onChange={(e) => handleDialogueVoiceChange(e.target.value)}
                className="w-full px-3 py-2 glass border border-slate-600/50 rounded-lg text-white text-sm focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-300 shadow-md hover:shadow-glow focus-ring bg-transparent backdrop-blur-sm"
              >
                <optgroup label="👩 Female Voices (Recommended for Dialogue)">
                  {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value} className="bg-slate-800 text-white">
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👨 Male Voices">
                  {NARRATOR_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value} className="bg-slate-800 text-white">
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Hidden audio element with modern event handling */}
        <audio
          ref={audioRef}
          preload="none"
          className="hidden"
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
            // Clean up the blob URL when audio finishes
            if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
              URL.revokeObjectURL(audioRef.current.src);
            }
          }}
        />
      </div>
    </Draggable>
    </div>
  );
};

export default AudioPlayer;