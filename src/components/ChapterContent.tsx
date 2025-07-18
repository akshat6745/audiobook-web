import React, { useMemo } from "react";
import { Paragraph } from "../types";
import { parseChapterTitle } from "../utils/config";
import LoadingSpinner from "./LoadingSpinner";

interface ChapterContentProps {
  paragraphs: Paragraph[];
  activeParagraphIndex: number | null;
  onParagraphClick: (index: number) => void;
  isLoading?: boolean;
  chapterTitle?: string;
  chapterNumber?: number;
  timestamp?: string;
  isLastChapter?: boolean;
  lastChapterNumber?: number | null;
  novelName?: string;
}

const ChapterContent: React.FC<ChapterContentProps> = ({
  paragraphs,
  activeParagraphIndex,
  onParagraphClick,
  isLoading = false,
  chapterTitle,
  chapterNumber,
  timestamp = "3 years ago",
  isLastChapter = false,
  lastChapterNumber = null,
  novelName,
}) => {
  const parsedChapterTitle = useMemo(
    () => parseChapterTitle(chapterTitle ?? ""),
    [chapterTitle]
  );
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoadingSpinner
          size="lg"
          message="Loading content..."
          variant="pulse"
        />
      </div>
    );
  }

  if (paragraphs.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="glass-dark p-8 rounded-2xl border border-slate-700/50 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-slate-300 text-lg font-medium">
            No content available
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This chapter appears to be empty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Chapter Header */}
      {chapterNumber && (
        <div className="text-center mb-6 animate-fade-in-down">
          <div className="inline-flex items-center px-4 py-2 glass-dark rounded-full border border-primary-500/30 mb-4">
            <svg
              className="w-4 h-4 text-primary-400 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-sm text-primary-300 font-medium tracking-wide uppercase">
              Chapter {chapterNumber}
            </span>
          </div>
        </div>
      )}

      {/* Chapter Title */}
      {chapterTitle && (
        <div
          className="text-center mb-12 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div
            data-paragraph-index={-1}
            className={`
              paragraph-item glass-dark p-6 rounded-xl cursor-pointer transition-all duration-300 border relative overflow-hidden inline-block
              ${
                activeParagraphIndex === -1
                  ? "border-primary-500/50 bg-primary-500/10 shadow-glow scale-[1.01]"
                  : "border-slate-700/50 hover:border-primary-500/30 hover:bg-primary-500/5"
              }
            `}
            onClick={() => onParagraphClick(-1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onParagraphClick(-1);
              }
            }}
            aria-label="Chapter title"
          >
            {/* Gradient accent line for active chapter title */}
            {activeParagraphIndex === -1 && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-accent-500 rounded-r-full" />
            )}
            
            <h1 className={`text-4xl font-bold mb-4 leading-tight transition-all duration-300 ${
              activeParagraphIndex === -1 ? "text-white" : "text-gradient hover:text-white"
            }`}>
              {parsedChapterTitle.title}
            </h1>
            
            {/* Chapter title metadata */}
            <div className="flex justify-center items-center mt-3 pt-3 border-t border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium">
                Chapter Title
              </span>
              {activeParagraphIndex === -1 && (
                <div className="flex items-center space-x-2 text-xs text-primary-400 ml-4">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse-glow" />
                  <span className="font-medium">Now Reading</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <div
            key={index}
            data-paragraph-index={index}
            className={`
              paragraph-item glass-dark p-4 rounded-xl cursor-pointer transition-all duration-300 border relative overflow-hidden animate-fade-in-up
              ${
                activeParagraphIndex === index
                  ? "border-primary-500/50 bg-primary-500/10 shadow-glow scale-[1.01]"
                  : "border-slate-700/50 hover:border-primary-500/30 hover:bg-primary-500/5"
              }
            `}
            onClick={() => onParagraphClick(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onParagraphClick(index);
              }
            }}
            aria-label={`Paragraph ${index + 1}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Gradient accent line for active paragraph */}
            {activeParagraphIndex === index && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-accent-500 rounded-r-full" />
            )}

            <p
              className={`
                text-lg leading-relaxed transition-all duration-300
                ${
                  activeParagraphIndex === index
                    ? "text-white font-medium"
                    : "text-slate-200 hover:text-white"
                }
              `}
              style={{ lineHeight: "1.8" }}
            >
              {paragraph.text}
            </p>

            {/* Paragraph metadata */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/30">
              <span className="text-xs text-slate-400 font-medium">
                Paragraph {index + 1}
              </span>
              {activeParagraphIndex === index && (
                <div className="flex items-center space-x-2 text-xs text-primary-400">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse-glow" />
                  <span className="font-medium">Now Reading</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chapter Footer */}
      <div
        className="mt-8 text-center glass-dark p-4 rounded-xl border border-slate-700/50 animate-fade-in-up"
        style={{ animationDelay: `${paragraphs.length * 0.1 + 0.5}s` }}
      >
        <div className="flex items-center justify-center space-x-4 text-sm text-slate-400">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{paragraphs.length} paragraphs</span>
          </div>

          {activeParagraphIndex !== null && (
            <>
              <div className="w-px h-4 bg-slate-600" />
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-primary-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="text-primary-300">
                  {activeParagraphIndex === -1 ? "Chapter Title" : `Paragraph ${activeParagraphIndex + 1}`}
                </span>
              </div>
            </>
          )}

          {timestamp && (
            <>
              <div className="w-px h-4 bg-slate-600" />
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span>{timestamp}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Congratulations Message for Last Chapter */}
      {isLastChapter && lastChapterNumber === chapterNumber && (
        <div
          className="mt-12 text-center animate-fade-in-up"
          style={{ animationDelay: `${paragraphs.length * 0.1 + 1}s` }}
        >
          <div className="glass-dark p-8 rounded-2xl border border-gradient-to-r from-amber-400/30 to-amber-600/30 shadow-glow-lg bg-gradient-to-br from-amber-400/5 to-amber-600/5">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-glow-lg animate-float">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>

            <h2 className="text-3xl font-bold text-gradient mb-4">
              🎉 Congratulations! 🎉
            </h2>

            <p className="text-xl text-white mb-4">
              You've completed the entire story!
            </p>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <p className="text-amber-300 font-semibold text-lg mb-2">
                {novelName ? `"${novelName}"` : "This amazing journey"}
              </p>
              <p className="text-slate-300">
                {lastChapterNumber} chapters • Complete
              </p>
            </div>

            <p className="text-slate-400 mb-6 leading-relaxed">
              Thank you for reading along! You've just finished an incredible
              story. Every chapter you read brought you closer to this moment.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>Story Complete</span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-300 rounded-full text-sm font-medium">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>Final Chapter</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterContent;
