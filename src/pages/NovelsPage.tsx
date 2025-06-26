import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNovels, fetchAllUserProgress } from '../services/api';
import { getCurrentUsername } from '../utils/config';
import { Novel, ReadingProgress } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import EpubUpload from '../components/EpubUpload';
import NovelCard from '../components/NovelCard';

const NovelsPage: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  const loadNovels = async () => {
    try {
      setLoading(true);
      
      try {
        // Try to fetch from API first
        const [novelsData, username] = await Promise.all([
          fetchNovels(),
          getCurrentUsername()
        ]);
        
        setNovels(novelsData);
        setError(null);

        if (username) {
          try {
            const progressData = await fetchAllUserProgress(username);
            setProgress(progressData.progress || []);
          } catch (err) {
            console.error('Failed to load progress:', err);
            setProgress([]);
          }
        }
      } catch (apiError) {
        // If API fails, use mock data for demo purposes
        console.log('API not available, using mock data');
        const mockNovels: Novel[] = [
          {
            id: '1',
            title: 'The Great Adventure',
            author: 'John Smith',
            chapterCount: 25,
            source: 'google_doc'
          },
          {
            id: '2', 
            title: 'Mystery of the Lost City',
            author: 'Jane Doe',
            chapterCount: 18,
            source: 'epub_upload'
          },
          {
            id: '3',
            title: 'Space Chronicles',
            author: 'Alex Johnson',
            chapterCount: 32,
            source: 'google_doc'
          },
          {
            id: '4',
            title: 'Tales from the Forest',
            author: 'Emily Brown',
            chapterCount: 22,
            source: 'epub_upload'
          }
        ];
        setNovels(mockNovels);
        setError(null);
        setProgress([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load novels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNovels();
  }, []);

  const handleUploadSuccess = (uploadedNovel: any) => {
    // Refresh the novels list after successful upload
    loadNovels();
    setShowUpload(false);
  };

  const getLastReadChapter = (novelName: string): number | undefined => {
    const entry = progress.find(p => p.novelName === novelName);
    return entry?.lastChapterRead;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading novels..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button
            onClick={loadNovels}
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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Available Novels</h1>
          <p className="text-gray-400">
            {novels.length} novel{novels.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center space-x-2"
        >
          <span>📁</span>
          <span>Upload EPUB</span>
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <EpubUpload
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Novels Grid */}
      {novels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">No novels available</div>
          <p className="text-gray-500 mb-6">
            Upload an EPUB file to get started with your audiobook library.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Upload Your First Novel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {novels.map((novel) => (
            <NovelCard
              key={novel.title}
              novel={novel}
              lastReadChapter={getLastReadChapter(novel.title)}
              onRead={(novelName) => navigate(`/novels/${encodeURIComponent(novelName)}/chapters`)}
              onResume={(novelName, chapter) => 
                navigate(`/novels/${encodeURIComponent(novelName)}/chapters?lastChapter=${chapter}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NovelsPage;