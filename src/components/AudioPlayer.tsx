import React, { useState, useEffect, useRef } from 'react';
import { Paragraph } from '../types';
import { VOICE_OPTIONS, SPEED_OPTIONS } from '../utils/config';
import { generateTts } from '../services/api';

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

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    if (currentParagraphIndex > 0) {
      handleStop();
      onParagraphChange(currentParagraphIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentParagraphIndex < paragraphs.length - 1) {
      handleStop();
      onParagraphChange(currentParagraphIndex + 1);
    }
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    handleStop(); // Stop current audio when voice changes
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audio Player
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Current Paragraph Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            Paragraph {currentParagraphIndex + 1} of {paragraphs.length}
          </p>
          <p className="text-gray-800 dark:text-gray-200 line-clamp-2">
            {paragraphs[currentParagraphIndex]?.text || 'No content available'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentParagraphIndex === 0}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
              </svg>
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              className="p-3 rounded-full bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={handleStop}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={handleNext}
              disabled={currentParagraphIndex === paragraphs.length - 1}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
              </svg>
            </button>
          </div>

          {/* Voice Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Voice:
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Speed:
            </label>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
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
    </div>
  );
};

export default AudioPlayer;