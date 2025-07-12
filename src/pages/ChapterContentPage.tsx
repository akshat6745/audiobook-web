import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChapterContent from "../components/ChapterContent";
import AudioPlayer from "../components/AudioPlayer";
import LoadingSpinner from "../components/LoadingSpinner";
import { fetchChapterContent, saveUserProgress } from "../services/api";
import { ChapterContent as ChapterContentType, Paragraph } from "../types";
import {
  getCurrentUsername,
  parseChapterTitle,
  parseNovelName,
  DEFAULT_NARRATOR_VOICE,
  DEFAULT_DIALOGUE_VOICE,
  SPEED_OPTIONS,
  API_BASE_URL,
} from "../utils/config";

interface NavigationState {
  chapterTitle?: string;
  lastChapterNumber?: number;
  isLastChapter?: boolean;
}

const ChapterContentPage: React.FC = () => {
  const { novelName, chapterNumber } = useParams<{
    novelName: string;
    chapterNumber: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as NavigationState;

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
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Store last chapter information from navigation state
  const [lastChapterNumber, setLastChapterNumber] = useState<number | null>(
    navigationState?.lastChapterNumber || null
  );
  const [isLastChapter, setIsLastChapter] = useState<boolean>(
    navigationState?.isLastChapter || false
  );

  // Audio player settings state
  const [audioSettings, setAudioSettings] = useState({
    playbackSpeed: SPEED_OPTIONS[2].value,
    narratorVoice: DEFAULT_NARRATOR_VOICE,
    dialogueVoice: DEFAULT_DIALOGUE_VOICE,
  });

  // Track if we're auto-advancing to continue playing
  // const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);

  // Ref for auto-scrolling functionality
  const contentContainerRef = useRef<HTMLDivElement>(null);

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

  // Update last chapter information when navigation state changes
  useEffect(() => {
    if (navigationState) {
      if (navigationState.lastChapterNumber) {
        setLastChapterNumber(navigationState.lastChapterNumber);
      }
      if (navigationState.isLastChapter !== undefined) {
        setIsLastChapter(navigationState.isLastChapter);
      }
    }
  }, [navigationState]);

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

  // Auto-scroll to active paragraph when it changes
  useEffect(() => {
    if (activeParagraphIndex !== null && showAudioPlayer) {
      const scrollToActiveParagraph = () => {
        setIsAutoScrolling(true);

        // Use querySelector to find the paragraph element
        const paragraphElement = document.querySelector(
          `[data-paragraph-index="${activeParagraphIndex}"]`
        ) as HTMLElement;

        if (paragraphElement) {
          // Calculate the offset to center the paragraph in the viewport
          const rect = paragraphElement.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const elementHeight = rect.height;

          // Calculate the desired scroll position to center the element
          const offsetTop = paragraphElement.offsetTop;
          const centerOffset = windowHeight / 2 - elementHeight / 2;
          const scrollToPosition = offsetTop - centerOffset;

          // Smooth scroll to the paragraph
          window.scrollTo({
            top: Math.max(0, scrollToPosition), // Ensure we don't scroll above the page
            behavior: "smooth",
          });

          // Reset auto-scrolling state after animation completes
          setTimeout(() => setIsAutoScrolling(false), 1000);
        } else {
          setIsAutoScrolling(false);
        }
      };

      // Add a small delay to ensure the paragraph is rendered and styled
      const timeoutId = setTimeout(scrollToActiveParagraph, 300);

      return () => {
        clearTimeout(timeoutId);
        setIsAutoScrolling(false);
      };
    }
  }, [activeParagraphIndex, showAudioPlayer]);

  const handleParagraphClick = (index: number) => {
    setActiveParagraphIndex(index);
    setShowAudioPlayer(true);
  };

  const handleParagraphChange = (index: number) => {
    // Map audio player index back to display index
    // Index 0 maps to chapter title (-1), index 1+ maps to paragraph index - 1
    const displayIndex = chapterContent?.chapterTitle 
      ? (index === 0 ? -1 : index - 1)
      : index;
    
    setActiveParagraphIndex(displayIndex);
  };

  // Convert display index to audio player index
  const getAudioPlayerIndex = (displayIndex: number) => {
    if (chapterContent?.chapterTitle) {
      return displayIndex === -1 ? 0 : displayIndex + 1;
    }
    return displayIndex;
  };

  const handlePreviousChapter = () => {
    if (currentChapterNumber > 1) {
      const newChapterNumber = currentChapterNumber - 1;
      setActiveParagraphIndex(0);
      navigate(
        `/novels/${encodeURIComponent(novelName!)}/chapters/${newChapterNumber}`,
        {
          state: {
            lastChapterNumber,
            isLastChapter: lastChapterNumber
              ? newChapterNumber === lastChapterNumber
              : false,
          },
        }
      );
    }
  };

  const handleNextChapter = () => {
    const newChapterNumber = currentChapterNumber + 1;
    setActiveParagraphIndex(0);
    navigate(
      `/novels/${encodeURIComponent(novelName!)}/chapters/${newChapterNumber}`,
      {
        state: {
          lastChapterNumber,
          isLastChapter: lastChapterNumber
            ? newChapterNumber === lastChapterNumber
            : false,
        },
      }
    );
  };

  const handleBackToChapters = () => {
    navigate(`/novels/${encodeURIComponent(novelName!)}/chapters`);
  };

  const handleChapterComplete = () => {
    // When chapter is complete, automatically go to next chapter
    // The audio player should continue playing from the first paragraph of the next chapter
    handleNextChapter();

    // Reset to first paragraph
    setActiveParagraphIndex(-1);
  };

  const handleAudioSettingsChange = (settings: {
    playbackSpeed: number;
    narratorVoice: string;
    dialogueVoice: string;
  }) => {
    setAudioSettings(settings);
  };

  const hasNextChapter = () => {
    // If we have last chapter information, use it to determine if there's a next chapter
    if (lastChapterNumber) {
      return currentChapterNumber < lastChapterNumber;
    }

    // Fallback: assume there could be a next chapter if we don't have the information
    // This maintains the existing behavior when navigation state is not available
    return true;
  };

  const handleChapterNavigation = () => {
    const targetChapter = parseInt(chapterInputValue, 10);
    if (!isNaN(targetChapter) && targetChapter > 0) {
      setActiveParagraphIndex(0);
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

  const parsedChapterTitle = useMemo(() => {
    return parseChapterTitle(
      chapterContent?.chapterTitle ?? `Chapter ${currentChapterNumber}`
    );
  }, [chapterContent, currentChapterNumber]);

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
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl font-bold text-white truncate">
                      {parsedChapterTitle.title}
                    </h1>
                    {isLastChapter &&
                      lastChapterNumber === currentChapterNumber && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-400/20 to-amber-600/20 border border-amber-400/30 rounded-full">
                          <svg
                            className="w-4 h-4 text-amber-400"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-amber-300 text-sm font-medium">
                            Final Chapter
                          </span>
                        </div>
                      )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">
                    {parseNovelName(novelName ?? "")} • {paragraphs.length}{" "}
                    paragraphs
                    {lastChapterNumber && (
                      <span>
                        {" "}
                        • Chapter {currentChapterNumber} of {lastChapterNumber}
                      </span>
                    )}
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
                  disabled={
                    isLastChapter && lastChapterNumber === currentChapterNumber
                  }
                  className={`btn-modern px-4 py-2 glass border rounded-lg font-medium transition-all duration-300 focus-ring ${
                    isLastChapter && lastChapterNumber === currentChapterNumber
                      ? "border-amber-500/50 text-amber-300 opacity-60 cursor-not-allowed"
                      : "border-slate-600 text-slate-300 hover:text-white hover:border-primary-500/50"
                  }`}
                  title={
                    isLastChapter && lastChapterNumber === currentChapterNumber
                      ? "You've reached the last chapter"
                      : "Go to next chapter"
                  }
                >
                  <span className="flex items-center space-x-2">
                    <span className="hidden sm:inline">
                      {isLastChapter &&
                      lastChapterNumber === currentChapterNumber
                        ? "Final Chapter"
                        : "Next"}
                    </span>
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
                        d={
                          isLastChapter &&
                          lastChapterNumber === currentChapterNumber
                            ? "M5 13l4 4L19 7"
                            : "M9 5l7 7-7 7"
                        }
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
      <div className="pt-40 pb-8" ref={contentContainerRef}>
        <ChapterContent
          paragraphs={paragraphs}
          activeParagraphIndex={activeParagraphIndex}
          onParagraphClick={handleParagraphClick}
          isLoading={loading}
          chapterTitle={chapterContent?.chapterTitle}
          chapterNumber={chapterContent?.chapterNumber || currentChapterNumber}
          timestamp={chapterContent?.timestamp || "3 years ago"}
          isLastChapter={isLastChapter}
          lastChapterNumber={lastChapterNumber}
          novelName={novelName ? decodeURIComponent(novelName) : undefined}
        />
      </div>

      {/* Auto-scroll indicator */}
      {isAutoScrolling && (
        <div className="fixed top-20 right-4 z-40 bg-primary-500/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-sm border border-primary-400/50 animate-fade-in">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Auto-scrolling to current paragraph</span>
          </div>
        </div>
      )}

      {/* Audio Player */}
      {showAudioPlayer &&
        paragraphs.length > 0 &&
        activeParagraphIndex !== null && (
          <AudioPlayer
            paragraphs={paragraphs}
            currentParagraphIndex={getAudioPlayerIndex(activeParagraphIndex)}
            onParagraphChange={handleParagraphChange}
            onClose={() => setShowAudioPlayer(false)}
            isVisible={showAudioPlayer}
            onChapterComplete={handleChapterComplete}
            hasNextChapter={hasNextChapter()}
            initialPlaybackSpeed={audioSettings.playbackSpeed}
            initialNarratorVoice={audioSettings.narratorVoice}
            initialDialogueVoice={audioSettings.dialogueVoice}
            // initialIsPlaying={isAutoAdvancing}
            onSettingsChange={handleAudioSettingsChange}
            chapterName={chapterContent?.chapterTitle}
          />
        )}

      {/* Show Audio Player Button */}
      {!showAudioPlayer && paragraphs.length > 0 && (
        <div className="px-4 pb-8">
          <button
            onClick={() => {
              // Start from chapter title if it exists, otherwise start from first paragraph
              const startIndex = chapterContent?.chapterTitle ? -1 : 0;
              setActiveParagraphIndex(startIndex);
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
