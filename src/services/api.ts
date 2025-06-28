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

// Base API URL - should match the Python backend
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Health check
export const checkHealth = async (): Promise<{ status: string }> => {
  const response = await api.get("/health");
  return response.data;
};

// Novel Management
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
  page: number = 1,
): Promise<PaginatedChapters> => {
  const encodedNovelName = encodeURIComponent(novelName);
  const response = await api.get(
    `/chapters-with-pages/${encodedNovelName}?page=${page}`,
  );
  return response.data;
};

export const fetchChapterContent = async (
  novelName: string,
  chapterNumber: number,
): Promise<ChapterContent> => {
  try {
    const encodedNovelName = encodeURIComponent(novelName);
    const response = await api.get(
      `/chapter?chapterNumber=${chapterNumber}&novelName=${encodedNovelName}`,
    );
    return response.data;
  } catch (error) {
    // If API fails, return mock chapter content
    console.log("API not available, using mock chapter content");

    // Mock chapter content with the requested data
    const mockContent: ChapterContent = {
      chapterNumber: chapterNumber,
      chapterTitle: "Nightmare begins",
      timestamp: "3 years ago",
      content: [
        "The darkness crept through the empty corridors of the old mansion, casting long shadows that seemed to dance with malevolent intent.",
        "Sarah clutched her flashlight tighter as she made her way up the creaking staircase, each step echoing through the silence like a warning.",
        "She had been warned about this place, about the stories that surrounded it, but desperation had driven her here nonetheless.",
        "The air grew colder with each passing moment, and she could feel something watching her from the shadows.",
        "This was where it all began, three years ago, when everything she thought she knew about the world came crashing down.",
        "The first scream pierced the night air, and Sarah realized she was no longer alone in this cursed place.",
        "Her heart pounded as footsteps echoed from somewhere above, slow and deliberate, as if whatever was up there knew she was coming.",
        "The nightmare that had haunted her dreams for three long years was about to become reality once again.",
      ],
    };

    return mockContent;
  }
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
  ttsRequest: DualVoiceTtsRequest,
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
      response.data.type,
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
  dialogueVoice: string,
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

export const getTtsStreamUrl = (text: string, voice: string): string => {
  const encodedText = encodeURIComponent(text);
  const encodedVoice = encodeURIComponent(voice);
  return `${API_BASE_URL}/tts?text=${encodedText}&voice=${encodedVoice}`;
};

// User Management
export const loginUser = async (
  username: string,
  password: string,
): Promise<ApiResponse> => {
  const response = await api.post("/userLogin", { username, password });
  return response.data;
};

export const registerUser = async (
  username: string,
  password: string,
): Promise<ApiResponse> => {
  const response = await api.post("/register", { username, password });
  return response.data;
};

export const saveUserProgress = async (
  username: string,
  novelName: string,
  lastChapterRead: number,
): Promise<ApiResponse> => {
  const response = await api.post("/user/progress", {
    username,
    novelName,
    lastChapterRead,
  });
  return response.data;
};

export const fetchAllUserProgress = async (
  username: string,
): Promise<UserProgress> => {
  const response = await api.get(
    `/user/progress?username=${encodeURIComponent(username)}`,
  );
  return response.data;
};

export const fetchUserProgressForNovel = async (
  username: string,
  novelName: string,
): Promise<ReadingProgress> => {
  const encodedNovelName = encodeURIComponent(novelName);
  const encodedUsername = encodeURIComponent(username);
  const response = await api.get(
    `/user/progress/${encodedNovelName}?username=${encodedUsername}`,
  );
  return response.data;
};

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw error;
  },
);

export default api;
