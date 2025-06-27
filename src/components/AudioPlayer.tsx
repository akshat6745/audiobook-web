import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Paragraph, EnhancedParagraph, VoiceOption } from '../types';
import { SPEED_OPTIONS, DEFAULT_NARRATOR_VOICE, DEFAULT_DIALOGUE_VOICE, NARRATOR_VOICES, DIALOGUE_VOICES } from '../utils/config';
import TTSService from '../services/ttsService';
import {
  initializeEnhancedParagraphs,
  cleanupAudioUrls,
  clearAudioDataForVoiceChange,
  calculateNextSpeed,
  generateAudioForParagraph,
  updateParagraphInList
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
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Initialize enhanced paragraphs from basic paragraphs
  useEffect(() => {
    setEnhancedParagraphs(initializeEnhancedParagraphs(paragraphs));
  }, [paragraphs]);

  // Clean up audio URLs when component unmounts
  useEffect(() => {
    return () => cleanupAudioUrls(enhancedParagraphs);
  }, [enhancedParagraphs]);

  // Update playback speed when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Helper function to update a specific paragraph
  const updateParagraph = (index: number, updates: Partial<EnhancedParagraph>) => {
    setEnhancedParagraphs(prev => updateParagraphInList(prev, index, updates));
  };

  const generateAudio = async (paragraphIndex: number) => {
    const paragraph = enhancedParagraphs[paragraphIndex];
    if (!paragraph) return false;

    updateParagraph(paragraphIndex, { isLoading: true, errors: null });
    
    const result = await generateAudioForParagraph(paragraph, selectedVoice, dialogueVoice);
    
    if (result.success && result.audioUrl) {
      updateParagraph(paragraphIndex, { 
        isLoading: false, 
        audioData: result.audioUrl,
        errors: null 
      });
      
      if (audioRef.current && paragraphIndex === currentParagraphIndex) {
        audioRef.current.src = result.audioUrl;
        audioRef.current.playbackRate = playbackSpeed;
      }
      
      return true;
    } else {
      updateParagraph(paragraphIndex, { 
        isLoading: false, 
        errors: result.error || 'Failed to generate audio' 
      });
      return false;
    }
  };

  const handlePlay = async () => {
    const currentParagraph = enhancedParagraphs[currentParagraphIndex];
    if (!currentParagraph) return;

    // Check if we need to generate audio or if it's already available
    if (!currentParagraph.audioData && !currentParagraph.isLoading) {
      const success = await generateAudio(currentParagraphIndex);
      if (!success) return;
    }

    // Wait for audio generation if still loading
    if (currentParagraph.isLoading) return;

    try {
      if (audioRef.current && currentParagraph.audioData) {
        audioRef.current.src = currentParagraph.audioData;
        audioRef.current.playbackRate = playbackSpeed;
        await audioRef.current.play();
        setIsPlaying(true);
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
      audioRef.current?.pause();
      setIsPlaying(false);
      onParagraphChange(currentParagraphIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentParagraphIndex < enhancedParagraphs.length - 1) {
      audioRef.current?.pause();
      setIsPlaying(false);
      onParagraphChange(currentParagraphIndex + 1);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    audioRef.current?.pause();
    setIsPlaying(false);
    // Clear audio data for all paragraphs so they regenerate with new voice
    setEnhancedParagraphs(prev => clearAudioDataForVoiceChange(prev));
  };

  const handleDialogueVoiceChange = (voice: string) => {
    setDialogueVoice(voice);
    audioRef.current?.pause();
    setIsPlaying(false);
    // Clear audio data for all paragraphs so they regenerate with new voice
    setEnhancedParagraphs(prev => clearAudioDataForVoiceChange(prev));
  };

  const handleSpeedClick = () => {
    setPlaybackSpeed(calculateNextSpeed(playbackSpeed));
  };

  if (!isVisible) return null;

  const currentParagraph = enhancedParagraphs[currentParagraphIndex];
  const isCurrentLoading = currentParagraph?.isLoading || false;
  const currentError = currentParagraph?.errors || null;
  const hasDialogue = currentParagraph ? TTSService.hasDialogue(currentParagraph.text) : false;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <Draggable
        handle=".drag-handle"
        defaultPosition={{ x: 20, y: 100 }}
        nodeRef={nodeRef}
      >
        <div ref={nodeRef} className="absolute bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-2xl z-50 min-w-[280px] max-w-[320px] pointer-events-auto transition-all duration-300 hover:shadow-3xl">
        
        {/* Drag Handle - Invisible but functional */}
        <div className="drag-handle absolute top-0 left-0 right-0 h-3 cursor-move"></div>

        {/* Error Display */}
        {currentError && (
          <div className="mx-3 mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-700 dark:text-red-300 text-xs flex items-center gap-1.5 animate-fadeIn">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            {currentError}
          </div>
        )}

        {/* Compact Current Paragraph Info */}
        <div className="p-3 border-b border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                {currentParagraphIndex + 1}/{enhancedParagraphs.length}
              </span>
              {hasDialogue && (
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  💬 Dual Voice
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            >
              <Close className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
            {currentParagraph?.text?.slice(0, 100) || 'No content'}...
          </p>
        </div>

        {/* Compact Controls */}
        <div className="p-3">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 0}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-sm hover:shadow-md"
            >
              <SkipPrevious className="w-4 h-4" />
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isCurrentLoading}
              className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg transform-gpu"
            >
              {isCurrentLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <PlayArrow className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === enhancedParagraphs.length - 1}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-sm hover:shadow-md"
            >
              <SkipNext className="w-4 h-4" />
            </button>

            <button
              onClick={handleSpeedClick}
              className="px-3 py-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg transform-gpu text-xs font-semibold min-w-[3rem]"
            >
              {playbackSpeed}×
            </button>
          </div>

          {/* Voice Controls Grid */}
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Narrator Voice (Male Recommended)
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <optgroup label="👨 Male Voices (Recommended for Narration)">
                  {NARRATOR_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👩 Female Voices">
                  {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Dialogue Voice (Female Recommended)
              </label>
              <select
                value={dialogueVoice}
                onChange={(e) => handleDialogueVoiceChange(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <optgroup label="👩 Female Voices (Recommended for Dialogue)">
                  {DIALOGUE_VOICES.map((voice: VoiceOption) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="👨 Male Voices">
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

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          preload="none"
          className="hidden"
        />
      </div>
    </Draggable>
    </div>
  );
};

export default AudioPlayer;