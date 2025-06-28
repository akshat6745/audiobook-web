import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import NovelsPage from './pages/NovelsPage';
import ChaptersPage from './pages/ChaptersPage';
import ChapterContentPage from './pages/ChapterContentPage';
import Navigation from './components/Navigation';
import { getCurrentUsername } from './utils/config';
import './styles/globals.css';
import './styles/components.css';
import './styles/modern-components.css';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const username = getCurrentUsername();
  return username ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-slate-100 relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 bg-mesh opacity-50 pointer-events-none" />
        <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        
        {/* Main content */}
        <div className="relative z-10">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/novels"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <NovelsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novels/:novelName/chapters"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <ChaptersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novels/:novelName/chapters/:chapterNumber"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <ChapterContentPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/novels" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;