import React from 'react';
import { Chapter } from '../types';
import { parseChapterTitle } from '../utils/config';

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
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const renderPageButton = (page: number, isActive = false) => (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        className={`px-3 py-2 text-sm rounded-md font-medium ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-white hover:bg-gray-600'
        }`}
      >
        {page}
      </button>
    );

    const renderEllipsis = (key: string) => (
      <span key={key} className="px-3 py-2 text-sm text-gray-400">
        ...
      </span>
    );

    const getPageNumbers = () => {
      const pages = [];
      // const showPages = 5; // Number of pages to show around current page
      
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
          pages.push(renderEllipsis('end-ellipsis'));
          pages.push(renderPageButton(totalPages, currentPage === totalPages));
        } else if (currentPage >= totalPages - 3) {
          // Near the end
          pages.push(renderEllipsis('start-ellipsis'));
          for (let i = totalPages - 4; i <= totalPages; i++) {
            pages.push(renderPageButton(i, currentPage === i));
          }
        } else {
          // In the middle
          pages.push(renderEllipsis('start-ellipsis'));
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(renderPageButton(i, currentPage === i));
          }
          pages.push(renderEllipsis('end-ellipsis'));
          pages.push(renderPageButton(totalPages, currentPage === totalPages));
        }
      }
      
      return pages;
    };

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm bg-gray-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          Previous
        </button>

        {getPageNumbers()}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm bg-gray-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div>
      {/* Latest Chapter */}
      {chapters.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Latest Chapter</h2>
          <div className="bg-gray-800 border border-blue-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    NEW
                  </span>
                  <span className="text-blue-400 font-medium">Latest Chapter</span>
                </div>
                <h3 className="text-white font-medium text-lg">
                  {parseChapterTitle(chapters[0].chapterTitle).title}
                </h3>
                <p className="text-gray-400 text-sm">
                  Chapter {chapters[0].chapterNumber}
                </p>
              </div>
              <button
                onClick={() => onChapterClick(chapters[0])}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                Read Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Chapters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6">All Chapters</h2>
        
        <div className="space-y-2">
          {chapters.slice(1).map((chapter) => {
            const { title, publishedTime } = parseChapterTitle(chapter.chapterTitle);
            const isRead = userProgress && chapter.chapterNumber <= userProgress;
            
            return (
              <div
                key={`${chapter.chapterNumber}-${chapter.chapterTitle}`}
                onClick={() => onChapterClick(chapter)}
                className="flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                      isRead 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {chapter.chapterNumber}
                    </span>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {title}
                      </h3>
                      {publishedTime && (
                        <p className="text-gray-400 text-sm">
                          {publishedTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {isRead && (
                    <span className="text-green-400 text-sm font-medium">
                      ✓ Read
                    </span>
                  )}
                  <svg 
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {renderPaginationControls()}
      </div>
    </div>
  );
};

export default ChapterList;