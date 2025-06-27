import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Paragraph } from '../types';
import { VOICE_OPTIONS, SPEED_OPTIONS } from '../utils/config';
import { generateTts } from '../services/api';
import {
  SkipPrevious,
  PlayArrow,
  Pause,
  SkipNext,
  Close,
  DragIndicator
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].value);
  const [playbackSpeed, setPlaybackSpeed] = useState(SPEED_OPTIONS[1].value);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrl = useRef<string | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // Clean up audio URL when component unmounts or changes
  useEffect(() => {
    return () => {
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
      }
    };
  }, []);

  // Handle audio ended - move to next paragraph
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      if (currentParagraphIndex < paragraphs.length - 1) {
        onParagraphChange(currentParagraphIndex + 1);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentParagraphIndex, paragraphs.length, onParagraphChange]);

  // Update playback speed when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const generateAudio = async (text: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const audioBlob = await generateTts({ text, voice: selectedVoice });
      
      // Clean up previous audio URL
      if (currentAudioUrl.current) {
        URL.revokeObjectURL(currentAudioUrl.current);
      }
      
      // Create new audio URL
      currentAudioUrl.current = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = currentAudioUrl.current;
        audioRef.current.playbackRate = playbackSpeed;
      }
      
      setIsLoading(false);
      return true;
    } catch (err) {
      setIsLoading(false);
      setError('Failed to generate audio. Please try again.');
      console.error('TTS Error:', err);
      return false;
    }
  };

  const handlePlay = async () => {
    if (!paragraphs[currentParagraphIndex]) return;

    const currentText = paragraphs[currentParagraphIndex].text;
    
    if (!audioRef.current?.src || audioRef.current.src !== currentAudioUrl.current) {
      const success = await generateAudio(currentText);
      if (!success) return;
    }

    try {
      await audioRef.current?.play();
      setIsPlaying(true);
    } catch (err) {
      setError('Failed to play audio. Please try again.');
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
    if (currentParagraphIndex < paragraphs.length - 1) {
      audioRef.current?.pause();
      setIsPlaying(false);
      onParagraphChange(currentParagraphIndex + 1);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    audioRef.current?.pause(); // Pause current audio when voice changes
    setIsPlaying(false);
  };

  if (!isVisible) return null;

  console.log('AudioPlayer rendering:', { isVisible, paragraphs: paragraphs.length, currentParagraphIndex });

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <Draggable
        handle=".drag-handle"
        defaultPosition={{ x: 20, y: 100 }}
        nodeRef={nodeRef}
      >
        <div ref={nodeRef} className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[300px] pointer-events-auto">
        {/* Drag Handle Header */}
        <div className="drag-handle flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-move">
          <div className="flex items-center gap-2">
            <DragIndicator className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Audio Player
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Close className="w-4 h-4" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-2 mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Current Paragraph Info */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">
            {currentParagraphIndex + 1} / {paragraphs.length}
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
            {paragraphs[currentParagraphIndex]?.text?.slice(0, 100) || 'No content'}...
          </p>
        </div>

        {/* Essential Controls */}
        <div className="p-3">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 0}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <SkipPrevious className="w-4 h-4" />
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              className="p-3 rounded-full bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <PlayArrow className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === paragraphs.length - 1}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <SkipNext className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Voice & Speed Controls */}
          <div className="flex gap-2 text-xs">
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
            
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-xs"
            >
              {SPEED_OPTIONS.map((speed) => (
                <option key={speed.value} value={speed.value}>
                  {speed.label}
                </option>
              ))}
            </select>
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