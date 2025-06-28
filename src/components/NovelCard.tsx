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
  const progressPercentage = lastReadChapter && novel.chapterCount 
    ? Math.round((lastReadChapter / novel.chapterCount) * 100) 
    : 0;

  return (
    <div className="group relative overflow-hidden glass-dark rounded-2xl p-6 border border-slate-700/50 hover:border-primary-500/30 card-hover transition-all duration-500 animate-fade-in-up">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/20 to-accent-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      
      <div className="relative flex flex-col h-full">
        {/* Header with source badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            novel.source === 'epub_upload' 
              ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-gradient-to-r from-primary-500/20 to-primary-600/20 text-primary-300 border border-primary-500/30'
          }`}>
            {novel.source === 'epub_upload' ? '📚 EPUB' : '🌐 WEB NOVEL'}
          </div>
          
          {lastReadChapter && (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <div className="w-8 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-400 to-accent-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
          )}
        </div>

        {/* Novel Info */}
        <div className="flex-1 mb-6">
          <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-primary-300 transition-colors duration-300">
            {novel.title}
          </h3>
          
          <div className="space-y-2 text-sm">
            {novel.author && (
              <p className="text-slate-400 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>by {novel.author}</span>
              </p>
            )}
            
            {novel.chapterCount && (
              <p className="text-slate-400 flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span>{novel.chapterCount} chapters</span>
              </p>
            )}

            {lastReadChapter && (
              <p className="text-primary-300 flex items-center space-x-2 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>Last read: Chapter {lastReadChapter}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {lastReadChapter ? (
            <div className="space-y-2">
              <button
                onClick={() => onResume(novel.title, lastReadChapter)}
                className="w-full btn-modern bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 px-4 rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
              >
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Continue Reading</span>
                </span>
              </button>
              <button
                onClick={() => onRead(novel.title)}
                className="w-full btn-modern glass border border-slate-600 text-slate-300 hover:text-white hover:border-primary-500/50 py-3 px-4 rounded-xl font-medium transition-all duration-300 focus-ring"
              >
                <span className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Browse Chapters</span>
                </span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRead(novel.title)}
              className="w-full btn-modern bg-gradient-to-r from-primary-500 to-accent-600 hover:from-primary-600 hover:to-accent-700 text-white py-3 px-4 rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Start Reading</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovelCard;