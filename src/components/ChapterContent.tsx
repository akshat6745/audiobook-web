import React from 'react';
import { Paragraph } from '../types';

interface ChapterContentProps {
  paragraphs: Paragraph[];
  activeParagraphIndex: number | null;
  onParagraphClick: (index: number) => void;
  isLoading?: boolean;
  chapterTitle?: string;
  chapterNumber?: number;
  timestamp?: string;
}

const ChapterContent: React.FC<ChapterContentProps> = ({
  paragraphs,
  activeParagraphIndex,
  onParagraphClick,
  isLoading = false,
  chapterTitle,
  chapterNumber,
  timestamp = "3 years ago"
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (paragraphs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No content available for this chapter.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Chapter Header */}
      {chapterNumber && (
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500 uppercase tracking-wide">
            Chapter {chapterNumber}
          </p>
        </div>
      )}
      
      {/* Chapter Title */}
      {chapterTitle && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {chapterTitle}
          </h1>
        </div>
      )}

      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <div
            key={index}
            className={`
              paragraph-item p-4 rounded-lg cursor-pointer transition-all duration-200
              ${activeParagraphIndex === index
                ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-md'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
              }
            `}
            onClick={() => onParagraphClick(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onParagraphClick(index);
              }
            }}
            aria-label={`Paragraph ${index + 1}`}
          >
            <p 
              className={`
                text-base leading-relaxed text-gray-800 dark:text-gray-200
                ${activeParagraphIndex === index ? 'font-medium' : ''}
              `}
              style={{ lineHeight: '1.8' }}
            >
              {paragraph.text}
            </p>
            
            {/* Paragraph number indicator */}
            <div className="flex justify-between items-center mt-2 opacity-60">
              <span className="text-xs text-gray-500">
                Paragraph {index + 1}
              </span>
              {activeParagraphIndex === index && (
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 5v10l7-5-7-5z" />
                  </svg>
                  Playing
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Chapter Footer with Timestamp */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          {paragraphs.length} paragraphs
          {activeParagraphIndex !== null && (
            <span className="ml-2">
              • Currently at paragraph {activeParagraphIndex + 1}
            </span>
          )}
        </p>
        {timestamp && (
          <p className="text-xs text-gray-400 mt-2">
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChapterContent;