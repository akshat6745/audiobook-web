import { useState, useEffect } from "react";
import {
  getCurrentUsername,
  setCurrentUsername,
  clearUserSession,
} from "../utils/config";

interface UseAuthReturn {
  username: string | null;
  isAuthenticated: boolean;
  login: (username: string) => void;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUsername();
    setUsername(currentUser);
  }, []);

  const login = (newUsername: string) => {
    setCurrentUsername(newUsername);
    setUsername(newUsername);
  };

  const logout = () => {
    clearUserSession();
    setUsername(null);
  };

  return {
    username,
    isAuthenticated: !!username,
    login,
    logout,
  };
};
