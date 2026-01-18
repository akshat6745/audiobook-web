export interface Novel {
  id: string | null;
  slug: string | null;
  title: string;
  author: string | null;
  chapterCount: number | null;
  source: "supabase" | "epub_upload";
  status: string | null;
  genres: string[] | null;
  description: string | null;
  hasImages?: boolean;
  imageCount?: number;
}

export interface Chapter {
  chapterNumber: number;
  chapterTitle: string;
  id: string;
  wordCount?: number;
}


export interface PaginatedChapters {
  chapters: Chapter[];
  total_pages: number;
  current_page: number;
}

export interface ChapterContent {
  content: string[];
  chapterNumber?: number;
  chapterTitle?: string;
  timestamp?: string;
}

export interface User {
  username: string;
  password: string;
}

export interface ReadingProgress {
  novelName: string;
  lastChapterRead: number;
}

export interface UserProgress {
  progress: ReadingProgress[];
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentParagraphIndex: number;
  selectedVoice: string;
  playbackSpeed: number;
  isVisible: boolean;
}

export interface VoiceOption {
  label: string;
  value: string;
}

export interface SpeedOption {
  label: string;
  value: number;
}

export interface ApiResponse<T = any> {
  status?: string;
  message?: string;
  detail?: string;
  data?: T;
}

export interface TtsRequest {
  text: string;
  voice: string;
}

export interface DualVoiceTtsRequest {
  text: string;
  paragraphVoice: string;
  dialogueVoice: string;
}

export interface Paragraph {
  text: string;
  index?: number;
}

export interface EnhancedParagraph {
  paragraphNumber: number;
  text: string;
  isLoading: boolean;
  audioData: string | null; // URL for the audio blob
  audioBlob: Blob | null; // Store the actual blob data
  errors: string | null;
  audioUrl?: string; // Optional URL for the audio blob
}
