   import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUsername, clearUserSession } from '../utils/config';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const username = getCurrentUsername();

  const handleLogout = () => {
    clearUserSession();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link 
            to="/novels" 
            className="text-xl font-bold text-blue-400 hover:text-blue-300 transition-colors"
          >
            📚 Audiobook Library
          </Link>
          <Link 
            to="/novels" 
            className="text-gray-300 hover:text-white transition-colors"
          >
            Novels
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {username && (
            <>
              <span className="text-gray-300">
                Welcome, <span className="text-blue-400 font-semibold">{username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;