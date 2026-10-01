// Configuration constants

// Default voice for TTS
export const DEFAULT_VOICE = "en-US-ChristopherNeural";

// Voice options available for TTS - Based on TTS Dual-Voice API Guide
export const VOICE_OPTIONS = [
  { label: "Ava (Female, US)", value: "en-US-AvaMultilingualNeural" },
  { label: "Christopher (Male, US)", value: "en-US-ChristopherNeural" },
  { label: "Jenny (Female, US)", value: "en-US-JennyNeural" },
  { label: "Sonia (Female, UK)", value: "en-GB-SoniaNeural" },
  { label: "Ryan (Male, UK)", value: "en-GB-RyanNeural" },
  {
    label: "Andrew (Male, US, Multilingual)",
    value: "en-US-AndrewMultilingualNeural",
  },
  {
    label: "Emma (Female, US, Multilingual)",
    value: "en-US-EmmaMultilingualNeural",
  },
];

// Speed options for playback
export const SPEED_OPTIONS = [
  { label: "0.5x", value: 0.5 },
  { label: "0.75x", value: 0.75 },
  { label: "1x", value: 1 },
  { label: "1.25x", value: 1.25 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
];

// Local storage keys
export const STORAGE_KEYS = {
  USERNAME: "audiobook_username",
  ACCESS_TOKEN: "audiobook_access_token",
  AUDIO_SETTINGS: "audiobook_audio_settings",
  READING_PROGRESS: "audiobook_reading_progress",
};

// Session management.
//
// The access token is what proves identity — every user-scoped endpoint
// derives the caller from it. There is deliberately no separate client-side
// expiry: the token carries its own, and a second independent clock would
// drift out of sync, leaving a UI that believes it is signed in while every
// request 401s. An expired token is detected by the backend rejecting it.

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error("Error reading access token");
    return null;
  }
};

export const getCurrentUsername = (): string | null => {
  try {
    // Without a token the username can't authorise anything, so a stored
    // name on its own does not count as a session.
    if (!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)) {
      return null;
    }
    return localStorage.getItem(STORAGE_KEYS.USERNAME);
  } catch (error) {
    console.error("Error getting current username");
    return null;
  }
};

export const setSession = (username: string, token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error("Error storing session");
  }
};

export const clearUserSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUDIO_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.READING_PROGRESS);
  } catch (error) {
    console.error("Error clearing user session");
  }
};

// Audio settings management
export interface AudioSettings {
  voice: string;
  playbackSpeed: number;
}

export const getAudioSettings = (): AudioSettings => {
  try {
    const settings = localStorage.getItem(STORAGE_KEYS.AUDIO_SETTINGS);
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error("Error getting audio settings:", error);
  }

  return {
    voice: DEFAULT_VOICE,
    playbackSpeed: 1,
  };
};

export const setAudioSettings = (settings: AudioSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIO_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error setting audio settings:", error);
  }
};

// Voice categories for better organization
export const NARRATOR_VOICES = [
  { label: "Ava (Female, US)", value: "en-US-AvaMultilingualNeural" },
  { label: "Christopher (Male, US)", value: "en-US-ChristopherNeural" },
  { label: "Jenny (Female, US)", value: "en-US-JennyNeural" },
  { label: "Sonia (Female, UK)", value: "en-GB-SoniaNeural" },
  { label: "Ryan (Male, UK)", value: "en-GB-RyanNeural" },
  {
    label: "Andrew (Male, US, Multilingual)",
    value: "en-US-AndrewMultilingualNeural",
  },
  {
    label: "Emma (Female, US, Multilingual)",
    value: "en-US-EmmaMultilingualNeural",
  },
];

export const DIALOGUE_VOICES = [
  { label: "Ava (Female, US)", value: "en-US-AvaMultilingualNeural" },
  { label: "Christopher (Male, US)", value: "en-US-ChristopherNeural" },
  { label: "Jenny (Female, US)", value: "en-US-JennyNeural" },
  { label: "Sonia (Female, UK)", value: "en-GB-SoniaNeural" },
  { label: "Ryan (Male, UK)", value: "en-GB-RyanNeural" },
  {
    label: "Andrew (Male, US, Multilingual)",
    value: "en-US-AndrewMultilingualNeural",
  },
  {
    label: "Emma (Female, US, Multilingual)",
    value: "en-US-EmmaMultilingualNeural",
  },
];

// Default voice combinations for optimal contrast
export const DEFAULT_NARRATOR_VOICE = "en-US-AvaMultilingualNeural";
export const DEFAULT_DIALOGUE_VOICE = "en-GB-RyanNeural";

// Helper function to get recommended voice pairs
export const getRecommendedVoicePairs = () => [
  {
    narrator: "en-US-ChristopherNeural",
    dialogue: "en-US-AriaNeural",
    description: "Deep Male + Expressive Female",
  },
  {
    narrator: "en-US-EricNeural",
    dialogue: "en-US-JennyNeural",
    description: "Warm Male + Clear Female",
  },
  {
    narrator: "en-US-GuyNeural",
    dialogue: "en-US-MichelleNeural",
    description: "Professional Male + Engaging Female",
  },
  {
    narrator: "en-US-RogerNeural",
    dialogue: "en-US-SaraNeural",
    description: "Mature Male + Pleasant Female",
  },
];

// Helper function to extract chapter title from novelName - chapterTitle format
const extractChapterTitleFromNovelFormat = (text: string): string => {
  // Handle "novelName - chapterTitle" format
  const dashSeparatorMatch = text.match(/^.+?\s*-\s*(.+)$/);
  if (dashSeparatorMatch) {
    return dashSeparatorMatch[1].trim();
  }
  return text;
};

// Helper function to parse chapter titles
export const parseChapterTitle = (title: string) => {
  console.log("Parsing chapter title:", JSON.stringify(title));

  // Handle multi-line format: "16\nChapter 16 Rebirth\n3 years ago"
  const lines = title
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length >= 2) {
    const chapterNumber = parseInt(lines[0], 10);
    const chapterLine = lines[1];
    const publishedTime = lines.length > 2 ? lines[2] : "";

    // Extract title from chapter line (remove "Chapter X" prefix if present)
    let chapterTitleMatch = chapterLine.match(/^(?:Chapter\s+\d+\s+)?(.+)$/i);
    let chapterTitle = chapterTitleMatch
      ? chapterTitleMatch[1].trim()
      : chapterLine;

    // Handle novelName - chapterTitle format
    chapterTitle = extractChapterTitleFromNovelFormat(chapterTitle);

    if (!isNaN(chapterNumber)) {
      return {
        chapterNumber,
        title: chapterTitle || `Chapter ${chapterNumber}`,
        publishedTime: publishedTime || "",
      };
    }
  }

  // Fallback to original regex pattern for single-line titles
  const match = title.match(
    /^(?:Chapter\s+)?(\d+)(?:\s*[-:]?\s*(.+?))?(?:\s*\((.+?)\))?$/i
  );

  if (match) {
    const [, chapterNumber, chapterTitle, publishedTime] = match;
    let cleanTitle = chapterTitle?.trim() || `Chapter ${chapterNumber}`;

    // Handle novelName - chapterTitle format
    cleanTitle = extractChapterTitleFromNovelFormat(cleanTitle);

    return {
      chapterNumber: parseInt(chapterNumber, 10),
      title: cleanTitle,
      publishedTime: publishedTime?.trim() || "",
    };
  }

  // Fallback parsing - handle novelName - chapterTitle format
  let cleanTitle = extractChapterTitleFromNovelFormat(title);

  return {
    chapterNumber: 0,
    title: cleanTitle,
    publishedTime: "",
  };
};

export const parseNovelName = (novelName: string): string => {
  // Handle novelName - 'shadow-slave' -> 'Shadow Slave'
  if (!novelName) return "";
  return novelName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper function to format chapter display
export const formatChapterTitle = (
  chapterNumber: number,
  title?: string
): string => {
  if (title && title !== `Chapter ${chapterNumber}`) {
    return `Chapter ${chapterNumber}: ${title}`;
  }
  return `Chapter ${chapterNumber}`;
};
