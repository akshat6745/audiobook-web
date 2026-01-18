import React, { useMemo, useState } from "react";
import { Chapter } from "../types";
import { parseChapterTitle } from "../utils/config";

interface ChapterListProps {
  chapters: Chapter[];
  currentPage: number;
  totalPages: number;
  userProgress: number | null;
  onChapterClick: (chapter: Chapter) => void;
  onPageChange: (page: number) => void;
}

const ChapterList: React.FC<ChapterListProps> = ({
  chapters,
  currentPage,
  totalPages,
  userProgress,
  onChapterClick,
  onPageChange,
}) => {
  const [gotoPageValue, setGotoPageValue] = useState(currentPage.toString());

  const handleGotoPageChange = (value: string) => {
    setGotoPageValue(value);
  };

  const handleGotoPageSubmit = () => {
    const targetPage = parseInt(gotoPageValue, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      onPageChange(targetPage);
    } else {
      // Reset to current page if invalid
      setGotoPageValue(currentPage.toString());
    }
  };

  const handleGotoPageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGotoPageSubmit();
    }
  };

  // Update goto page value when current page changes
  React.useEffect(() => {
    setGotoPageValue(currentPage.toString());
  }, [currentPage]);

  const renderPaginationControls = (showGotoButton = false) => {
    if (totalPages <= 1) return null;

    const renderPageButton = (page: number, isActive = false) => (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        className={`px-4 py-2 text-sm rounded-lg font-medium transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow scale-105"
            : "glass-dark text-slate-300 hover:text-white hover:bg-primary-500/20 hover:scale-105"
        }`}
      >
        {page}
      </button>
    );

    const renderEllipsis = (key: string) => (
      <span key={key} className="px-3 py-2 text-sm text-slate-400">
        <svg className="w-2 h-2 fill-current" viewBox="0 0 8 8">
          <circle cx="1" cy="4" r="1" />
          <circle cx="4" cy="4" r="1" />
          <circle cx="7" cy="4" r="1" />
        </svg>
      </span>
    );

    const getPageNumbers = () => {
      const pages = [];

      // Always show first page
      pages.push(renderPageButton(1, currentPage === 1));

      if (totalPages <= 7) {
        // If we have 7 or fewer pages, show all pages
        for (let i = 2; i <= totalPages; i++) {
          pages.push(renderPageButton(i, currentPage === i));
        }
      } else {
        // More complex logic for many pages
        if (currentPage <= 4) {
          // Near the beginning
          for (let i = 2; i <= 5; i++) {
            pages.push(renderPageButton(i, currentPage === i));
          }
          pages.push(renderEllipsis("end-ellipsis"));
          pages.push(renderPageButton(totalPages, currentPage === totalPages));
        } else if (currentPage >= totalPages - 3) {
          // Near the end
          pages.push(renderEllipsis("start-ellipsis"));
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(renderPageButton(i, currentPage === i));
          }
        } else {
          // In the middle
          pages.push(renderEllipsis("start-ellipsis"));
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(renderPageButton(i, currentPage === i));
          }
          pages.push(renderEllipsis("end-ellipsis"));
          pages.push(renderPageButton(totalPages, currentPage === totalPages));
        }
      }

      return pages;
    };

    return (
      <div
        className={`flex items-center justify-between ${showGotoButton ? "mb-8" : "mt-10"}`}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-modern px-4 py-2 text-sm glass-dark text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:text-white hover:bg-primary-500/20 transition-all duration-300 focus-ring"
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
              <span>Previous</span>
            </span>
          </button>

          <div className="flex items-center space-x-2">{getPageNumbers()}</div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="btn-modern px-4 py-2 text-sm glass-dark text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:text-white hover:bg-primary-500/20 transition-all duration-300 focus-ring"
          >
            <span className="flex items-center space-x-2">
              <span>Next</span>
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

        {showGotoButton && (
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-400">
              Go to page:
            </span>
            <div className="flex items-center gap-2 px-3 py-2 glass-dark rounded-lg border border-primary-500/30">
              <input
                type="number"
                value={gotoPageValue}
                onChange={(e) => handleGotoPageChange(e.target.value)}
                onKeyPress={handleGotoPageKeyPress}
                className="w-16 bg-transparent text-sm font-medium text-primary-300 border-none outline-none focus:text-white text-center"
                min="1"
                max={totalPages}
                placeholder="1"
              />
              <span className="text-xs text-slate-400">of {totalPages}</span>
              <button
                onClick={handleGotoPageSubmit}
                className="ml-1 px-3 py-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg text-sm font-medium transition-all duration-300 focus-ring shadow-lg hover:shadow-xl"
                title="Go to page"
              >
                Go
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const parsedLatestChapterTitle = useMemo(() => {
    return parseChapterTitle(chapters[0]?.chapterTitle ?? "");
  }, [chapters]);

  return (
    <div className="px-4 max-w-6xl mx-auto">
      {/* Latest Chapter */}
      {chapters.length > 0 && (
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-8 w-1 bg-gradient-to-b from-primary-400 to-primary-600 rounded-full" />
            <h2 className="text-3xl font-bold text-gradient">Latest Chapter</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-primary-500/50 to-transparent" />
          </div>

          <div className="glass-dark rounded-2xl p-8 border border-primary-500/20 card-hover shadow-glow-lg animate-glow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-accent-500/30 rounded-full blur-lg animate-pulse-glow" />
                    <span className="relative bg-gradient-to-r from-accent-400 to-accent-600 text-white text-xs px-4 py-2 rounded-full font-bold tracking-wide shadow-glow">
                      NEW
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gradient-to-b from-primary-400 to-accent-500" />
                  <span className="text-primary-300 font-semibold tracking-wide">
                    Latest Release
                  </span>
                </div>
                <h3 className="text-white font-bold text-2xl mb-2 leading-tight">
                  {parsedLatestChapterTitle.title}
                </h3>
                <div className="flex items-center space-x-4 text-slate-400">
                  <span className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span>Chapter {chapters[0].chapterNumber}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => onChapterClick(chapters[0])}
                className="btn-modern bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-8 py-4 rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring animate-float"
              >
                <span className="flex items-center space-x-3">
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
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Read Now</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Chapters */}
      <div
        className="glass-dark rounded-2xl p-8 border border-slate-700/50 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="flex items-center space-x-3 mb-8">
          <div className="h-8 w-1 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full" />
          <h2 className="text-2xl font-bold text-white">All Chapters</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent" />
          <span className="text-slate-400 text-sm font-medium">
            {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Top Pagination Controls */}
        {renderPaginationControls(true)}

        <div className="space-y-3">
          {chapters.slice(1).map((chapter, index) => {
            const { title, publishedTime } = parseChapterTitle(
              chapter.chapterTitle
            );
            const isRead =
              userProgress && chapter.chapterNumber <= userProgress;

            return (
              <div
                key={`${chapter.chapterNumber}-${chapter.chapterTitle}`}
                onClick={() => onChapterClick(chapter)}
                className="group relative overflow-hidden glass rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-glow border border-slate-700/30 hover:border-primary-500/30 animate-slide-in-right"
                style={{ animationDelay: `${(index + 1) * 0.1}s` }}
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div
                      className={`relative w-12 h-12 flex items-center justify-center rounded-xl font-bold transition-all duration-300 ${
                        isRead
                          ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-glow"
                          : "glass-dark text-slate-300 group-hover:text-primary-300"
                      }`}
                    >
                      {isRead && (
                        <div className="absolute inset-0 bg-emerald-400/20 rounded-xl blur-md animate-pulse-glow" />
                      )}
                      <span className="relative">{chapter.chapterNumber}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-lg group-hover:text-primary-300 transition-colors duration-300 truncate">
                        {title}
                      </h3>
                      {publishedTime && (
                        <p className="text-slate-400 text-sm mt-1 flex items-center space-x-2">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          <span>{publishedTime}</span>
                        </p>
                      )}
                      {chapter.wordCount && (
                        <p className="text-slate-500 text-xs mt-1 flex items-center space-x-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                          </svg>
                          <span>{chapter.wordCount.toLocaleString()} words</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {isRead && (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                        <span>Completed</span>
                      </div>
                    )}
                    <svg
                      className="w-6 h-6 text-slate-400 group-hover:text-primary-400 transition-all duration-300 group-hover:scale-110"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {renderPaginationControls(false)}
      </div>
    </div>
  );
};

export default ChapterList;
