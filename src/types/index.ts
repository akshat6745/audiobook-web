export interface Novel {
  id: string | null;
  title: string;
  author: string | null;
  chapterCount: number | null;
  source: 'google_doc' | 'epub_upload';
}

export interface BaseChapter {
  chapterNumber: number;
  chapterTitle: string;
}

export interface WebNovelChapter extends BaseChapter {
  link: string;
}

export interface EpubChapter extends BaseChapter {
  id: string;
}

export type Chapter = WebNovelChapter | EpubChapter;

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

export interface Paragraph {
  text: string;
  index?: number;
}