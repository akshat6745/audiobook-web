import { useState, useEffect } from "react";
import {
  getCurrentUsername,
  setSession,
  clearUserSession,
} from "../utils/config";

interface UseAuthReturn {
  username: string | null;
  isAuthenticated: boolean;
  /** Both halves are required: a username without a token is not a session. */
  signIn: (username: string, token: string) => void;
  logout: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUsername();
    setUsername(currentUser);
  }, []);

  const signIn = (newUsername: string, token: string) => {
    setSession(newUsername, token);
    setUsername(newUsername);
  };

  const logout = () => {
    clearUserSession();
    setUsername(null);
  };

  return {
    username,
    isAuthenticated: !!username,
    signIn,
    logout,
  };
};
