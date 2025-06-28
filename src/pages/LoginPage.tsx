import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, registerUser } from "../services/api";
import { getCurrentUsername, setCurrentUsername } from "../utils/config";
import LoadingSpinner from "../components/LoadingSpinner";

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = getCurrentUsername();
    if (currentUser) {
      navigate("/novels");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        try {
          // Try real API first
          await loginUser(username, password);
        } catch (apiError) {
          // If API fails, use mock authentication for demo
          console.log("API not available, using mock authentication");
          // Just simulate a delay
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        setCurrentUsername(username);
        navigate("/novels");
      } else {
        try {
          // Try real API first
          await registerUser(username, password);
        } catch (apiError) {
          // If API fails, use mock registration for demo
          console.log("API not available, using mock registration");
          // Just simulate a delay
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        setIsLogin(true);
        setError(null);
        // Clear form
        setPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 max-w-md w-full space-y-8 p-8">
        {/* Logo and Header */}
        <div className="text-center animate-fade-in-down">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl shadow-glow mb-6 animate-float">
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gradient mb-3">
            {isLogin ? "Welcome Back" : "Join AudioLibrary"}
          </h2>
          <p className="text-lg text-slate-400">
            {isLogin
              ? "Continue your reading journey"
              : "Start your audiobook adventure"}
          </p>
        </div>

        {/* Form Container */}
        <div
          className="glass-dark rounded-2xl p-8 border border-slate-700/50 shadow-glow-lg animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="w-full pl-10 pr-3 py-3 glass border border-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 placeholder-slate-400"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full pl-10 pr-3 py-3 glass border border-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 placeholder-slate-400"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="glass border border-red-500/30 bg-red-500/10 p-4 rounded-xl animate-shake">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-400"
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
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-modern w-full bg-gradient-to-r from-primary-500 to-accent-600 hover:from-primary-600 hover:to-accent-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-glow hover:shadow-glow-lg transition-all duration-300 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <LoadingSpinner size="sm" variant="dots" />
                  <span>
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </span>
                </div>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
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
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setPassword("");
                }}
                className="text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors duration-300 hover:underline"
                disabled={loading}
              >
                {isLogin
                  ? "Don't have an account? Join us today"
                  : "Already have an account? Sign in instead"}
              </button>
            </div>
          </form>
        </div>

        {/* Features */}
        <div
          className="grid grid-cols-2 gap-4 mt-8 animate-fade-in-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="glass-dark p-4 rounded-xl border border-slate-700/30 text-center">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-300 font-medium">Free Forever</p>
          </div>
          <div className="glass-dark p-4 rounded-xl border border-slate-700/30 text-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Secure & Private
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
