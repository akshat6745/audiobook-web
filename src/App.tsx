import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import NovelsPage from "./pages/NovelsPage";
import ChaptersPage from "./pages/ChaptersPage";
import ChapterContentPage from "./pages/ChapterContentPage";
import Navigation from "./components/Navigation";
import { getCurrentUsername } from "./utils/config";
import "./styles/globals.css";
import "./styles/components.css";
import "./styles/modern-components.css";

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const username = getCurrentUsername();
  return username ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
        {/* Main content */}
        <div className="relative">
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
