import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChapterContent from "../components/ChapterContent";
import SimpleAudioPlayer from "../components/SimpleAudioPlayer";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchChapterContent, saveUserProgress } from "../services/api";
import { ChapterContent as ChapterContentType, Paragraph } from "../types";
import {
  getCurrentUsername,
  parseChapterTitle,
  parseNovelName,
  DEFAULT_NARRATOR_VOICE,
  DEFAULT_DIALOGUE_VOICE,
  API_BASE_URL,
} from "../utils/config";

const ChapterContentPage: React.FC = () => {
  const { novelName, chapterNumber } = useParams<{
    novelName: string;
    chapterNumber: string;
  }>();
  const navigate = useNavigate();

  const [chapterContent, setChapterContent] =
    useState<ChapterContentType | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<
    number | null
  >(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const currentChapterNumber = parseInt(chapterNumber || "1", 10);
  const username = getCurrentUsername();
  const [chapterInputValue, setChapterInputValue] = useState(
    currentChapterNumber.toString()
  );

  const loadChapterContent = useCallback(async () => {
    if (!novelName || !chapterNumber) return;

    try {
      setLoading(true);
      setError(null);

      const content = await fetchChapterContent(
        novelName,
        currentChapterNumber
      );
      setChapterContent(content);

      // Convert content array to paragraph objects
      const paragraphObjects: Paragraph[] = content.content
        .map((text, index) => ({
          text: text.trim(),
          index,
        }))
        .filter((p) => p.text.length > 0); // Filter out empty paragraphs

      setParagraphs(paragraphObjects);
    } catch (err) {
      console.error("Error loading chapter content:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load chapter content"
      );
    } finally {
      setLoading(false);
    }
  }, [novelName, chapterNumber, currentChapterNumber]);

  useEffect(() => {
    if (!novelName || !chapterNumber) {
      setError("Invalid chapter parameters");
      setLoading(false);
      return;
    }

    loadChapterContent();
  }, [novelName, chapterNumber, loadChapterContent]);

  // Save reading progress when chapter loads
  useEffect(() => {
    if (username && novelName && currentChapterNumber && chapterContent) {
      saveUserProgress(username, novelName, currentChapterNumber).catch(
        console.error
      );
    }
  }, [username, novelName, currentChapterNumber, chapterContent]);

  // Update chapter input value when chapter changes
  useEffect(() => {
    setChapterInputValue(currentChapterNumber.toString());
  }, [currentChapterNumber]);

  const handleParagraphClick = (index: number) => {
    setActiveParagraphIndex(index);
    setShowAudioPlayer(true);
  };

  const handleParagraphChange = (index: number) => {
    setActiveParagraphIndex(index);
  };

  const handlePreviousChapter = () => {
    if (currentChapterNumber > 1) {
      navigate(
        `/novels/${encodeURIComponent(novelName!)}/chapters/${currentChapterNumber - 1}`
      );
    }
  };

  const handleNextChapter = () => {
    navigate(
      `/novels/${encodeURIComponent(novelName!)}/chapters/${currentChapterNumber + 1}`
    );
  };

  const handleBackToChapters = () => {
    navigate(`/novels/${encodeURIComponent(novelName!)}/chapters`);
  };

  const handleChapterNavigation = () => {
    const targetChapter = parseInt(chapterInputValue, 10);
    if (!isNaN(targetChapter) && targetChapter > 0) {
      navigate(
        `/novels/${encodeURIComponent(novelName!)}/chapters/${targetChapter}`
      );
    }
  };

  const handleChapterInputChange = (value: string) => {
    setChapterInputValue(value);
  };

  const handleChapterInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleChapterNavigation();
    }
  };

  const handleDownloadChapter = async () => {
    if (!novelName || !currentChapterNumber) {
      console.error("Novel name or chapter number not provided");
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/novel-with-tts?novelName=${encodeURIComponent(novelName)}&chapterNumber=${currentChapterNumber}&voice=${encodeURIComponent(DEFAULT_NARRATOR_VOICE)}&dialogueVoice=${encodeURIComponent(DEFAULT_DIALOGUE_VOICE)}`,
        {
          method: "GET",
          headers: {
            Accept: "audio/mp3",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${novelName.replace(/[^a-z0-9]/gi, "_")}_chapter_${currentChapterNumber}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download chapter:", error);
      // You could add a toast notification here
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center pt-24">
        <div className="text-center">
          <LoadingSpinner
            size="xl"
            message="Loading chapter content..."
            variant="wave"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 pt-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass-dark p-8 rounded-2xl border border-red-500/20 shadow-glow-lg">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Unable to Load Chapter
            </h2>
            <p className="text-red-300 mb-8 text-center leading-relaxed">
              {error}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={loadChapterContent}
                className="btn-modern px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
              >
                <span className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Try Again</span>
                </span>
              </button>
              <button
                onClick={handleBackToChapters}
                className="btn-modern px-6 py-3 glass border border-slate-600 text-slate-300 hover:text-white hover:border-primary-500/50 rounded-xl font-semibold transition-all duration-300 focus-ring"
              >
                <span className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  <span>Back to Chapters</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-mesh opacity-20 pointer-events-none" />

      {/* Chapter Header - Modern floating design */}
      <div className="fixed top-20 left-0 right-0 z-40 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="glass-dark rounded-2xl border border-slate-700/50 shadow-glow-lg p-4 animate-fade-in-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToChapters}
                  className="p-3 glass rounded-xl hover:bg-primary-500/20 text-slate-400 hover:text-white transition-all duration-300 focus-ring"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-white truncate">
                    {/* {chapterContent?.chapterTitle || `Chapter ${currentChapterNumber}`} */}
                    {
                      parseChapterTitle(
                        chapterContent?.chapterTitle ||
                          `Chapter ${currentChapterNumber}`
                      ).title
                    }
                  </h1>
                  <p className="text-sm text-slate-400 truncate">
                    {parseNovelName(novelName ?? "")} • {paragraphs.length}{" "}
                    paragraphs
                  </p>
                </div>
              </div>

              {/* Chapter Navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePreviousChapter}
                  disabled={currentChapterNumber <= 1}
                  className="btn-modern px-4 py-2 glass border border-slate-600 text-slate-300 hover:text-white hover:border-primary-500/50 rounded-lg font-medium transition-all duration-300 focus-ring disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                  </span>
                </button>

                <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-primary-500/30">
                  <span className="text-sm font-medium text-primary-300 whitespace-nowrap">
                    Ch.
                  </span>
                  <input
                    type="number"
                    value={chapterInputValue}
                    onChange={(e) => handleChapterInputChange(e.target.value)}
                    onKeyPress={handleChapterInputKeyPress}
                    className="w-16 bg-transparent text-sm font-medium text-primary-300 border-none outline-none focus:text-white text-center"
                    min="1"
                  />
                  <button
                    onClick={handleChapterNavigation}
                    className="ml-1 p-1 hover:bg-primary-500/20 rounded text-primary-400 hover:text-white transition-colors duration-200"
                    title="Go to chapter"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleNextChapter}
                  className="btn-modern px-4 py-2 glass border border-slate-600 text-slate-300 hover:text-white hover:border-primary-500/50 rounded-lg font-medium transition-all duration-300 focus-ring"
                >
                  <span className="flex items-center space-x-2">
                    <span className="hidden sm:inline">Next</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </span>
                </button>

                <button
                  onClick={handleDownloadChapter}
                  disabled={isDownloading}
                  className="btn-modern px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-300 focus-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                  title="Download Chapter as MP3"
                >
                  <span className="flex items-center space-x-2">
                    {isDownloading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    )}
                    <span className="hidden sm:inline">Download</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter Content */}
      <div className="pt-40 pb-8">
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
      {showAudioPlayer &&
        paragraphs.length > 0 &&
        activeParagraphIndex !== null && (
          <div className="px-4 pb-8">
            <SimpleAudioPlayer
              paragraphs={paragraphs}
              currentParagraphIndex={activeParagraphIndex}
              onParagraphChange={handleParagraphChange}
            />
          </div>
        )}

      {/* Show Audio Player Button */}
      {!showAudioPlayer && paragraphs.length > 0 && (
        <div className="px-4 pb-8">
          <button
            onClick={() => {
              setActiveParagraphIndex(0);
              setShowAudioPlayer(true);
            }}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-medium"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.29 13.5A1 1 0 014 12.5v-5a1 1 0 01.29-.707l4.093-3.316zM15.657 5.343a1 1 0 011.414 0 7 7 0 010 9.9 1 1 0 11-1.414-1.414 5 5 0 000-7.072 1 1 0 010-1.414z" />
                <path d="M13.243 7.757a1 1 0 011.414 0 3 3 0 010 4.243 1 1 0 11-1.414-1.414 1 1 0 000-1.414 1 1 0 010-1.415z" />
              </svg>
              Start Audio Playback
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChapterContentPage;
