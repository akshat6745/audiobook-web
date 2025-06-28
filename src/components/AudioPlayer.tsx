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
  const [isExpanded, setIsExpanded] = useState(false);
  
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
      const wasPlaying = isPlaying;
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
      
      // Mark for auto-play if was playing
      if (wasPlaying) {
        const playButton = document.querySelector('[data-testid="play-button"]');
        if (playButton) {
          playButton.setAttribute('data-auto-play', 'true');
        }
      }
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
        <div ref={nodeRef} className="absolute glass-dark border border-slate-700/50 rounded-lg shadow-lg z-50 pointer-events-auto transition-all duration-300 backdrop-blur-xl">
        
        {/* Compact Header with Controls */}
        <div className="drag-handle cursor-move p-3 rounded-t-lg bg-gradient-to-r from-primary-500/10 to-accent-500/10">
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
              className="w-7 h-7 glass rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-all flex items-center justify-center"
            >
              <SkipPrevious className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === enhancedParagraphs.length - 1}
              className="w-7 h-7 glass rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-all flex items-center justify-center"
            >
              <SkipNext className="w-4 h-4" />
            </button>

            {/* Speed Control */}
            <button
              onClick={handleSpeedClick}
              className="px-2 py-1 bg-emerald-500/80 text-white rounded text-xs font-bold min-w-[2.5rem] hover:bg-emerald-600 transition-all"
            >
              {playbackSpeed}×
            </button>

            {/* Progress Info */}
            <div className="flex-1 text-center">
              <div className="text-xs text-slate-300 font-medium">
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
              className="w-7 h-7 glass rounded text-slate-300 hover:text-white transition-all flex items-center justify-center"
            >
              <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-7 h-7 glass rounded hover:bg-red-500/20 text-slate-400 hover:text-white transition-all flex items-center justify-center"
            >
              <Close className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Progress Bar */}
          {duration > 0 && (
            <div 
              className="mt-2 h-1.5 bg-slate-700 rounded-full cursor-pointer relative overflow-hidden"
              onClick={handleSeek}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
          )}

          {/* Error Display */}
          {currentError && (
            <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <span className="flex-1 truncate">{currentError}</span>
            </div>
          )}
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-700/30 bg-slate-900/50 rounded-b-lg">
            {/* Current Paragraph Preview */}
            <div className="mb-3 p-2 glass rounded text-xs text-slate-300 max-h-16 overflow-hidden">
              {currentParagraph?.text?.slice(0, 150) || 'No content available'}...
            </div>

            {/* Voice Controls */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-primary-300 mb-1">Narrator</label>
                <select
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full px-2 py-1 glass border border-slate-600/50 rounded text-white text-xs bg-transparent"
                >
                  <optgroup label="Male Voices">
                    {NARRATOR_VOICES.map((voice: VoiceOption) => (
                      <option key={voice.value} value={voice.value} className="bg-slate-800">
                        {voice.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Female Voices">
                    {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                      <option key={voice.value} value={voice.value} className="bg-slate-800">
                        {voice.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs text-accent-300 mb-1">Dialogue</label>
                <select
                  value={dialogueVoice}
                  onChange={(e) => handleDialogueVoiceChange(e.target.value)}
                  className="w-full px-2 py-1 glass border border-slate-600/50 rounded text-white text-xs bg-transparent"
                >
                  <optgroup label="Female Voices">
                    {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                      <option key={voice.value} value={voice.value} className="bg-slate-800">
                        {voice.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Male Voices">
                    {NARRATOR_VOICES.map((voice: VoiceOption) => (
                      <option key={voice.value} value={voice.value} className="bg-slate-800">
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
            // Clean up the blob URL when audio finishes
            if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
              URL.revokeObjectURL(audioRef.current.src);
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