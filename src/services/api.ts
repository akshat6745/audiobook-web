import axios from "axios";
import {
  Novel,
  PaginatedChapters,
  ChapterContent,
  UserProgress,
  ReadingProgress,
  TtsRequest,
  DualVoiceTtsRequest,
  ApiResponse,
} from "../types";
import { clearUserSession, getToken } from "../utils/config";

// Base API URL - should match the Python backend
export const API_BASE_URL = process.env.REACT_APP_API_URL || "https://audiobook-python.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the access token to every request. User-scoped endpoints identify
// the caller from this header — nothing else proves who is asking.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to get the correct identifier for a novel
// cloudflare novels use slug, EPUB novels use title
export const getNovelIdentifier = (novel: Novel): string => {
  return novel.slug || novel.title;
};


// Health check
export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await api.get("/health");
  return response.data;
};

// Novel Management
// The library is scoped to the access token, not to a username we send.
export const fetchNovels = async (): Promise<Novel[]> => {
  const response = await api.get("/novels");
  return response.data;
};

export const uploadEpub = async (file: File): Promise<ApiResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload-epub", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Chapter Management
export const fetchChapters = async (
  novelName: string,
  page: number = 1
): Promise<PaginatedChapters> => {
  const encodedNovelName = encodeURIComponent(novelName);
  const response = await api.get(
    `/chapters-with-pages/${encodedNovelName}?page=${page}`
  );
  return response.data;
};

export const fetchChapterContent = async (
  novelName: string,
  chapterNumber: number
): Promise<ChapterContent> => {
  // Errors propagate deliberately. This used to swallow every failure and
  // return hardcoded placeholder prose, which disguised real problems —
  // including an expired session — as a chapter that simply loaded.
  const encodedNovelName = encodeURIComponent(novelName);
  const response = await api.get(
    `/chapter?chapterNumber=${chapterNumber}&novelName=${encodedNovelName}`
  );
  return response.data;
};

// Text-to-Speech
export const generateTts = async (ttsRequest: TtsRequest): Promise<Blob> => {
  const response = await api.post("/tts", ttsRequest, {
    responseType: "blob",
  });
  return response.data;
};

// Text-to-Speech with Dual Voices
export const generateDualVoiceTts = async (
  ttsRequest: DualVoiceTtsRequest
): Promise<Blob> => {
  try {
    const response = await api.post("/tts-dual-voice", ttsRequest, {
      responseType: "blob",
      timeout: 60000, // 60 second timeout for audio generation
    });

    // Verify we received a valid blob
    if (!response.data || response.data.size === 0) {
      throw new Error("Received empty response from TTS service");
    }

    console.log(
      "Received TTS blob:",
      response.data.size,
      "bytes, type:",
      response.data.type
    );
    return response.data;
  } catch (error) {
    console.error("TTS API error:", error);
    throw error;
  }
};

// Generate TTS for Novel Chapter with Dual Voices
export const generateChapterAudio = async (
  novelName: string,
  chapterNumber: number,
  narratorVoice: string,
  dialogueVoice: string
): Promise<Blob> => {
  const params = new URLSearchParams({
    novelName,
    chapterNumber: chapterNumber.toString(),
    voice: narratorVoice,
    dialogueVoice,
  });

  const response = await api.get(`/novel-with-tts?${params}`, {
    responseType: "blob",
  });
  return response.data;
};

// User Management
export const loginUser = async (
  username: string,
  password: string
): Promise<ApiResponse> => {
  const response = await api.post("/userLogin", { username, password });
  return response.data;
};

/**
 * Exchange a Google ID token for a session. The backend verifies the token
 * and returns the account it maps to — an existing account if this Google
 * identity was linked to one, otherwise a new Gmail-named account.
 */
export const googleSignIn = async (idToken: string): Promise<ApiResponse> => {
  const response = await api.post("/auth/google", { idToken });
  return response.data;
};

/**
 * Attach a Google identity to the signed-in account (identified by the
 * access token the request interceptor attaches), so Google sign-in reaches
 * this account afterwards. The password keeps working.
 */
export const linkGoogleAccount = async (
  idToken: string
): Promise<ApiResponse & { linked?: boolean; email?: string }> => {
  const response = await api.post("/auth/google/link", { idToken });
  return response.data;
};

export const registerUser = async (
  username: string,
  password: string
): Promise<ApiResponse> => {
  const response = await api.post("/register", { username, password });
  return response.data;
};

export const saveUserProgress = async (
  novelName: string,
  lastChapterRead: number
): Promise<ApiResponse> => {
  const response = await api.post("/user/progress", {
    novelName,
    lastChapterRead,
  });
  return response.data;
};

export const fetchAllUserProgress = async (): Promise<UserProgress> => {
  const response = await api.get("/user/progress");
  return response.data;
};

export const fetchUserProgressForNovel = async (
  novelName: string
): Promise<ReadingProgress> => {
  const encodedNovelName = encodeURIComponent(novelName);
  const response = await api.get(`/user/progress/${encodedNovelName}`);
  return response.data;
};

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 means our token is missing, expired, or no longer trusted. Drop the
    // session and send the user to sign in, rather than leaving them on a
    // page where every request fails. The backend uses 401 (never 403) for
    // all of those cases so this single branch catches them.
    if (error.response?.status === 401) {
      clearUserSession();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error;
  }
);

export default api;
