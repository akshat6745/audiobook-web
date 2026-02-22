import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchChapters,
  fetchUserProgressForNovel,
  saveUserProgress,
} from "../services/api";
import { getCurrentUsername, parseNovelName } from "../utils/config";
import { Chapter, PaginatedChapters } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import ChapterList from "../components/ChapterList";

const ChaptersPage: React.FC = () => {
  const { novelName } = useParams<{ novelName: string }>();
  const navigate = useNavigate();

  const [chaptersData, setChaptersData] = useState<PaginatedChapters>({
    chapters: [],
    total_pages: 1,
    current_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadChapters = useCallback(
    async (page: number = 1) => {
      if (!novelName) return;

      try {
        setLoading(true);
        const data = await fetchChapters(decodeURIComponent(novelName), page);
        setChaptersData(data);
        setCurrentPage(page);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load chapters"
        );
      } finally {
        setLoading(false);
      }
    },
    [novelName]
  );

  const loadUserProgress = useCallback(async () => {
    if (!novelName) return;

    const username = getCurrentUsername();
    if (username) {
      try {
        const progressData = await fetchUserProgressForNovel(
          username,
          decodeURIComponent(novelName)
        );
        setUserProgress(progressData.lastChapterRead);
      } catch (err) {
        console.error("Failed to load user progress:", err);
        setUserProgress(null);
      }
    }
  }, [novelName]);

  useEffect(() => {
    loadChapters();
    loadUserProgress();
  }, [loadChapters, loadUserProgress]);

  const getLastChapterNumber = useCallback(async (): Promise<number> => {
    if (!novelName) return 1;

    try {
      // If we're on the last page, find the highest chapter number
      if (currentPage === chaptersData.total_pages) {
        return Math.max(...chaptersData.chapters.map(ch => ch.chapterNumber));
      }

      // If not on last page, fetch the last page to get the highest chapter number
      const lastPageData = await fetchChapters(decodeURIComponent(novelName), chaptersData.total_pages);
      return Math.max(...lastPageData.chapters.map(ch => ch.chapterNumber));
    } catch (err) {
      console.error("Failed to get last chapter number:", err);
      // Fallback: return highest from current chapters
      return Math.max(...chaptersData.chapters.map(ch => ch.chapterNumber));
    }
  }, [novelName, currentPage, chaptersData]);

  const handleChapterClick = async (chapter: Chapter) => {
    if (!novelName) return;

    const username = getCurrentUsername();
    if (username) {
      try {
        await saveUserProgress(
          username,
          decodeURIComponent(novelName),
          chapter.chapterNumber
        );
        setUserProgress(chapter.chapterNumber);
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    }

    // Get the last chapter number to pass along
    const lastChapterNumber = await getLastChapterNumber();

    navigate(`/novels/${novelName}/chapters/${chapter.chapterNumber}`, {
      state: {
        chapterTitle: chapter.chapterTitle,
        lastChapterNumber: lastChapterNumber,
        isLastChapter: chapter.chapterNumber === lastChapterNumber
      },
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= chaptersData.total_pages && page !== currentPage) {
      loadChapters(page);
    }
  };

  if (!novelName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center pt-24">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white text-center">
            Novel Not Found
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center pt-24">
        <div className="text-center">
          <LoadingSpinner
            size="xl"
            message="Loading chapters..."
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
              Unable to Load Chapters
            </h2>
            <p className="text-red-300 mb-8 text-center leading-relaxed">
              {error}
            </p>
            <div className="text-center">
              <button
                onClick={() => loadChapters(currentPage)}
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 pt-24 pb-8">
      {/* Background effects */}
      <div className="fixed inset-0 bg-mesh opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-8 relative">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in-down">
          <div className="glass-dark p-6 rounded-2xl border border-slate-700/50 shadow-glow">
            <h1 className="text-4xl font-bold text-gradient mb-4">
              {parseNovelName(decodeURIComponent(novelName))}
            </h1>
            <div className="flex items-center space-x-4 text-slate-400">
              <span className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>
                  {chaptersData.chapters.length} chapters on this page
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>
                  Page {chaptersData.current_page} of {chaptersData.total_pages}
                </span>
              </span>
            </div>
          </div>
        </div>

        {userProgress && (
          <div
            className="mb-8 animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="glass-dark border border-emerald-500/30 rounded-2xl p-6 shadow-glow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-glow">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-emerald-300 font-semibold text-lg">
                      Continue Reading
                    </h3>
                    <p className="text-slate-400">
                      Resume from Chapter {userProgress}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const lastChapterNumber = await getLastChapterNumber();
                    navigate(`/novels/${novelName}/chapters/${userProgress}`, {
                      state: {
                        lastChapterNumber: lastChapterNumber,
                        isLastChapter: userProgress === lastChapterNumber
                      }
                    });
                  }}
                  className="btn-modern bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
                >
                  <span className="flex items-center space-x-2">
                    <span>Resume</span>
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
              </div>
            </div>
          </div>
        )}

        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <ChapterList
            chapters={chaptersData.chapters}
            currentPage={chaptersData.current_page}
            totalPages={chaptersData.total_pages}
            userProgress={userProgress}
            onChapterClick={handleChapterClick}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ChaptersPage;
