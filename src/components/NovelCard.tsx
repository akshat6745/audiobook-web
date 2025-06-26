import React from 'react';
import { Novel } from '../types';

interface NovelCardProps {
  novel: Novel;
  lastReadChapter?: number;
  onRead: (novelName: string) => void;
  onResume: (novelName: string, chapter: number) => void;
}

const NovelCard: React.FC<NovelCardProps> = ({
  novel,
  lastReadChapter,
  onRead,
  onResume,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex flex-col h-full">
        {/* Novel Info */}
        <div className="flex-1 mb-4">
          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
            {novel.title}
          </h3>
          
          {novel.author && (
            <p className="text-gray-400 text-sm mb-2">
              by {novel.author}
            </p>
          )}
          
          {novel.chapterCount && (
            <p className="text-gray-400 text-sm mb-2">
              {novel.chapterCount} chapters
            </p>
          )}
          
          <div className="flex items-center space-x-2 text-xs">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              novel.source === 'epub_upload' 
                ? 'bg-green-900/30 text-green-400' 
                : 'bg-blue-900/30 text-blue-400'
            }`}>
              {novel.source === 'epub_upload' ? 'EPUB' : 'Web Novel'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {lastReadChapter ? (
            <div className="space-y-2">
              <button
                onClick={() => onResume(novel.title, lastReadChapter)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
              >
                Continue Reading (Ch. {lastReadChapter})
              </button>
              <button
                onClick={() => onRead(novel.title)}
                className="w-full border border-gray-600 text-gray-300 hover:bg-gray-700 py-2 px-4 rounded-md transition-colors"
              >
                Browse Chapters
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRead(novel.title)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors font-medium"
            >
              Start Reading
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovelCard;