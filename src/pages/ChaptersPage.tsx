import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchChapters, fetchUserProgressForNovel, saveUserProgress } from '../services/api';
import { getCurrentUsername } from '../utils/config';
import { Chapter, PaginatedChapters } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ChapterList from '../components/ChapterList';

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

  const loadChapters = useCallback(async (page: number = 1) => {
    if (!novelName) return;
    
    try {
      setLoading(true);
      const data = await fetchChapters(decodeURIComponent(novelName), page);
      setChaptersData(data);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  }, [novelName]);

  const loadUserProgress = useCallback(async () => {
    if (!novelName) return;
    
    const username = getCurrentUsername();
    if (username) {
      try {
        const progressData = await fetchUserProgressForNovel(username, decodeURIComponent(novelName));
        setUserProgress(progressData.lastChapterRead);
      } catch (err) {
        console.error('Failed to load user progress:', err);
        setUserProgress(null);
      }
    }
  }, [novelName]);

  useEffect(() => {
    loadChapters();
    loadUserProgress();
  }, [loadChapters, loadUserProgress]);

  const handleChapterClick = async (chapter: Chapter) => {
    if (!novelName) return;
    
    const username = getCurrentUsername();
    if (username) {
      try {
        await saveUserProgress(username, decodeURIComponent(novelName), chapter.chapterNumber);
        setUserProgress(chapter.chapterNumber);
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    }

    navigate(`/novels/${novelName}/chapters/${chapter.chapterNumber}`, {
      state: { chapterTitle: chapter.chapterTitle }
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= chaptersData.total_pages && page !== currentPage) {
      loadChapters(page);
    }
  };

  if (!novelName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Novel not found</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading chapters..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button
            onClick={() => loadChapters(currentPage)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {decodeURIComponent(novelName)}
        </h1>
        <div className="flex items-center space-x-4 text-gray-400">
          <span>{chaptersData.chapters.length} chapters on this page</span>
          <span>•</span>
          <span>Page {chaptersData.current_page} of {chaptersData.total_pages}</span>
        </div>
      </div>

      {userProgress && (
        <div className="mb-6 bg-blue-900/20 border border-blue-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-400 font-medium">Continue Reading</h3>
              <p className="text-gray-300 text-sm">
                Resume from Chapter {userProgress}
              </p>
            </div>
            <button
              onClick={() => navigate(`/novels/${novelName}/chapters/${userProgress}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      <ChapterList
        chapters={chaptersData.chapters}
        currentPage={chaptersData.current_page}
        totalPages={chaptersData.total_pages}
        userProgress={userProgress}
        onChapterClick={handleChapterClick}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default ChaptersPage;