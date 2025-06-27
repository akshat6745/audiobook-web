import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChapterContent from '../components/ChapterContent';
import AudioPlayer from '../components/AudioPlayer';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchChapterContent, saveUserProgress } from '../services/api';
import { ChapterContent as ChapterContentType, Paragraph } from '../types';
import { getCurrentUsername } from '../utils/config';

const ChapterContentPage: React.FC = () => {
  const { novelName, chapterNumber } = useParams<{
    novelName: string;
    chapterNumber: string;
  }>();
  const navigate = useNavigate();

  const [chapterContent, setChapterContent] = useState<ChapterContentType | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [isAudioPlayerVisible, setIsAudioPlayerVisible] = useState(false);

  const currentChapterNumber = parseInt(chapterNumber || '1', 10);
  const username = getCurrentUsername();

  const loadChapterContent = useCallback(async () => {
    if (!novelName || !chapterNumber) return;

    try {
      setLoading(true);
      setError(null);
      
      const content = await fetchChapterContent(novelName, currentChapterNumber);
      setChapterContent(content);
      
      // Convert content array to paragraph objects
      const paragraphObjects: Paragraph[] = content.content.map((text, index) => ({
        text: text.trim(),
        index
      })).filter(p => p.text.length > 0); // Filter out empty paragraphs
      
      setParagraphs(paragraphObjects);
    } catch (err) {
      console.error('Error loading chapter content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chapter content');
    } finally {
      setLoading(false);
    }
  }, [novelName, chapterNumber, currentChapterNumber]);

  useEffect(() => {
    if (!novelName || !chapterNumber) {
      setError('Invalid chapter parameters');
      setLoading(false);
      return;
    }

    loadChapterContent();
  }, [novelName, chapterNumber, loadChapterContent]);

  // Save reading progress when chapter loads
  useEffect(() => {
    if (username && novelName && currentChapterNumber && chapterContent) {
      saveUserProgress(username, novelName, currentChapterNumber).catch(console.error);
    }
  }, [username, novelName, currentChapterNumber, chapterContent]);

  const handleParagraphClick = (index: number) => {
    setActiveParagraphIndex(index);
    setIsAudioPlayerVisible(true);
  };

  const handleParagraphChange = (index: number) => {
    setActiveParagraphIndex(index);
  };

  const handleCloseAudioPlayer = () => {
    setIsAudioPlayerVisible(false);
    setActiveParagraphIndex(null);
  };

  const handlePreviousChapter = () => {
    if (currentChapterNumber > 1) {
      navigate(`/novels/${encodeURIComponent(novelName!)}/chapters/${currentChapterNumber - 1}`);
    }
  };

  const handleNextChapter = () => {
    navigate(`/novels/${encodeURIComponent(novelName!)}/chapters/${currentChapterNumber + 1}`);
  };

  const handleBackToChapters = () => {
    navigate(`/novels/${encodeURIComponent(novelName!)}/chapters`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Chapter
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={loadChapterContent}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToChapters}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Chapters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToChapters}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {chapterContent?.chapterTitle || `Chapter ${currentChapterNumber}`}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {novelName} • {paragraphs.length} paragraphs
                </p>
              </div>
            </div>

            {/* Chapter Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousChapter}
                disabled={currentChapterNumber <= 1}
                className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                Ch. {currentChapterNumber}
              </span>
              <button
                onClick={handleNextChapter}
                className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Content */}
      <div className={`${isAudioPlayerVisible ? 'pb-64' : 'pb-8'}`}>
        <ChapterContent
          paragraphs={paragraphs}
          activeParagraphIndex={activeParagraphIndex}
          onParagraphClick={handleParagraphClick}
          isLoading={loading}
          chapterTitle={chapterContent?.chapterTitle}
          chapterNumber={chapterContent?.chapterNumber || currentChapterNumber}
          timestamp={chapterContent?.timestamp || "3 years ago"}
        />
      </div>

      {/* Audio Player */}
      {isAudioPlayerVisible && paragraphs.length > 0 && activeParagraphIndex !== null && (
        <AudioPlayer
          paragraphs={paragraphs}
          currentParagraphIndex={activeParagraphIndex}
          onParagraphChange={handleParagraphChange}
          onClose={handleCloseAudioPlayer}
          isVisible={isAudioPlayerVisible}
        />
      )}

      {/* Compact Mobile-Friendly Floating Audio Button */}
      {!isAudioPlayerVisible && paragraphs.length > 0 && (
        <button
          onClick={() => {
            setActiveParagraphIndex(0);
            setIsAudioPlayerVisible(true);
          }}
          className="fixed bottom-4 right-4 p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 z-50 hover:scale-105 transform-gpu backdrop-blur-sm border border-white/20"
          title="Start Audio Playbook"
        >
          <div className="relative">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.29 13.5A1 1 0 014 12.5v-5a1 1 0 01.29-.707l4.093-3.316zM15.657 5.343a1 1 0 011.414 0 7 7 0 010 9.9 1 1 0 11-1.414-1.414 5 5 0 000-7.072 1 1 0 010-1.414z" />
              <path d="M13.243 7.757a1 1 0 011.414 0 3 3 0 010 4.243 1 1 0 11-1.414-1.414 1 1 0 000-1.414 1 1 0 010-1.415z" />
            </svg>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </button>
      )}
    </div>
  );
};

export default ChapterContentPage;