import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNovels, fetchAllUserProgress } from "../services/api";
import { getCurrentUsername } from "../utils/config";
import { Novel, ReadingProgress } from "../types";
import LoadingSpinner from "../components/LoadingSpinner";
import EpubUpload from "../components/EpubUpload";
import NovelCard from "../components/NovelCard";

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
          getCurrentUsername(),
        ]);

        setNovels(novelsData);
        setError(null);

        if (username) {
          try {
            const progressData = await fetchAllUserProgress(username);
            setProgress(progressData.progress || []);
          } catch (err) {
            console.error("Failed to load progress:", err);
            setProgress([]);
          }
        }
      } catch (apiError) {
        // If API fails, use mock data for demo purposes
        console.log("API not available, using mock data");
        const mockNovels: Novel[] = [
          {
            id: "1",
            title: "The Great Adventure",
            author: "John Smith",
            chapterCount: 25,
            source: "google_doc",
          },
          {
            id: "2",
            title: "Mystery of the Lost City",
            author: "Jane Doe",
            chapterCount: 18,
            source: "epub_upload",
          },
          {
            id: "3",
            title: "Space Chronicles",
            author: "Alex Johnson",
            chapterCount: 32,
            source: "google_doc",
          },
          {
            id: "4",
            title: "Tales from the Forest",
            author: "Emily Brown",
            chapterCount: 22,
            source: "epub_upload",
          },
        ];
        setNovels(mockNovels);
        setError(null);
        setProgress([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load novels");
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
    const entry = progress.find((p) => p.novelName === novelName);
    return entry?.lastChapterRead;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
        <LoadingSpinner
          size="xl"
          message="Loading your library..."
          variant="wave"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
        <div className="text-center glass-dark p-8 rounded-2xl border border-red-500/20 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
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
          <h3 className="text-xl font-bold text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-red-300 mb-6">{error}</p>
          <button
            onClick={loadNovels}
            className="btn-modern bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
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
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-12 animate-fade-in-down">
          <div className="inline-flex items-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center shadow-glow animate-float">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-5xl font-bold text-gradient mb-2">
                Your Library
              </h1>
              <p className="text-xl text-slate-400">
                {novels.length} novel{novels.length !== 1 ? "s" : ""} ready to
                explore
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div
          className="flex justify-center mb-12 animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <button
            onClick={() => setShowUpload(true)}
            className="btn-modern bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
          >
            <span className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <span>Upload New EPUB</span>
            </span>
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowUpload(false)}
          />
          <div className="relative max-w-2xl w-full">
            <EpubUpload
              onClose={() => setShowUpload(false)}
              onSuccess={handleUploadSuccess}
            />
          </div>
        </div>
      )}

      {/* Novels Grid */}
      <div className="max-w-7xl mx-auto">
        {novels.length === 0 ? (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="max-w-md mx-auto glass-dark p-12 rounded-3xl border border-slate-700/50">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Your library awaits
              </h3>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Upload your first EPUB file to begin your audiobook journey.
                Transform any book into an immersive listening experience.
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="btn-modern bg-gradient-to-r from-primary-500 to-accent-600 hover:from-primary-600 hover:to-accent-700 text-white px-8 py-4 rounded-xl font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring"
              >
                <span className="flex items-center space-x-2">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Add Your First Book</span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {novels.map((novel, index) => (
              <div
                key={novel.title}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <NovelCard
                  novel={novel}
                  lastReadChapter={getLastReadChapter(novel.title)}
                  onRead={(novelName) =>
                    navigate(
                      `/novels/${encodeURIComponent(novelName)}/chapters`
                    )
                  }
                  onResume={(novelName, chapter) =>
                    navigate(
                      `/novels/${encodeURIComponent(novelName)}/chapters/${chapter}`
                    )
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NovelsPage;
