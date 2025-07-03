import { Paragraph, EnhancedParagraph } from "../types";
import TTSService from "../services/ttsService";

export const MIN_CHARACTERS = 1500;
export const PRELOAD_BEHIND_COUNT = 0; // Don't preload previous paragraphs

export const initializeEnhancedParagraphs = (
  paragraphs: Paragraph[]
): EnhancedParagraph[] => {
  return paragraphs.map((paragraph, index) => ({
    paragraphNumber: index + 1,
    text: paragraph.text,
    isLoading: false,
    audioData: null,
    audioBlob: null,
    errors: null,
    audioUrl: undefined, // Store the blob URL for reuse
  }));
};

export const cleanupAudioUrls = (paragraphs: EnhancedParagraph[]): void => {
  paragraphs.forEach((paragraph) => {
    if (paragraph.audioData) {
      TTSService.cleanupAudioUrl(paragraph.audioData);
    }
  });
};

export const clearAudioDataForVoiceChange = (
  paragraphs: EnhancedParagraph[]
): EnhancedParagraph[] => {
  return paragraphs.map((p) => {
    // Clean up existing blob URL
    if (p.audioUrl) {
      URL.revokeObjectURL(p.audioUrl);
    }
    return {
      ...p,
      audioData: null,
      audioBlob: null,
      audioUrl: undefined,
    };
  });
};

export const calculateNextSpeed = (currentSpeed: number): number => {
  if (currentSpeed >= 2) {
    return 0.5;
  }
  return Math.min(currentSpeed + 0.25, 2);
};

export const generateAudioForParagraph = async (
  paragraph: EnhancedParagraph,
  narratorVoice: string,
  dialogueVoice: string
): Promise<{
  success: boolean;
  audioUrl?: string;
  audioBlob?: Blob;
  error?: string;
}> => {
  try {
    // Clean up previous audio URL for this paragraph
    if (paragraph.audioUrl) {
      URL.revokeObjectURL(paragraph.audioUrl);
    }

    // Use dual-voice TTS for better audiobook experience
    const result = await TTSService.generateDualVoiceTTS(
      paragraph.text,
      narratorVoice,
      dialogueVoice
    );

    console.log("result from TTS service:", result);

    if (result.success && result.audioBlob) {
      // Create a persistent blob URL that will be stored in the paragraph
      const audioUrl = URL.createObjectURL(result.audioBlob);
      console.log("Audio generated successfully, created blob URL:", audioUrl);

      return {
        success: true,
        audioUrl: audioUrl,
        audioBlob: result.audioBlob,
      };
    }

    return result;
  } catch (err) {
    console.error("TTS Error:", err);
    return {
      success: false,
      error: "Failed to generate audio. Please try again.",
    };
  }
};

export const updateParagraphInList = (
  paragraphs: EnhancedParagraph[],
  index: number,
  updates: Partial<EnhancedParagraph>
): EnhancedParagraph[] => {
  return paragraphs.map((p, i) => (i === index ? { ...p, ...updates } : p));
};

/**
 * Get the range of paragraphs that should be preloaded for optimal performance
 * Only preloads future paragraphs until MIN_CHARACTERS threshold is reached
 */
export const getPreloadRange = (
  currentIndex: number,
  totalParagraphs: number,
  paragraphs: EnhancedParagraph[]
): { start: number; end: number } => {
  const start = currentIndex; // Start from current paragraph, no previous ones
  let end = currentIndex;
  let totalCharacters = 0;

  // Add characters from current and future paragraphs until we reach MIN_CHARACTERS
  for (
    let i = currentIndex;
    i < totalParagraphs && totalCharacters < MIN_CHARACTERS;
    i++
  ) {
    if (paragraphs[i]) {
      totalCharacters += paragraphs[i].text.length;
      end = i;
    }
  }

  return { start, end };
};

/**
 * Clean up audio URLs that are outside the preload range to free memory
 */
export const cleanupAudioOutsideRange = (
  paragraphs: EnhancedParagraph[],
  currentIndex: number
): EnhancedParagraph[] => {
  const { start, end } = getPreloadRange(
    currentIndex,
    paragraphs.length,
    paragraphs
  );

  return paragraphs.map((p, index) => {
    // Keep audio for paragraphs in the preload range
    if (index >= start && index <= end) {
      return p;
    }

    // Clean up audio for paragraphs outside the range
    if (p.audioUrl) {
      URL.revokeObjectURL(p.audioUrl);
    }

    return {
      ...p,
      audioUrl: undefined,
      audioBlob: null,
      audioData: null,
    };
  });
};

/**
 * Get list of paragraph indices that need audio loading
 * Only loads current and future paragraphs up to MIN_CHARACTERS
 */
export const getParagraphsToLoad = (
  paragraphs: EnhancedParagraph[],
  currentIndex: number
): number[] => {
  const { start, end } = getPreloadRange(
    currentIndex,
    paragraphs.length,
    paragraphs
  );
  const toLoad: number[] = [];

  for (let i = start; i <= end; i++) {
    const paragraph = paragraphs[i];
    if (paragraph && !paragraph.audioBlob && !paragraph.isLoading) {
      toLoad.push(i);
    }
  }

  // Prioritize current paragraph, then adjacent ones
  toLoad.sort((a, b) => {
    const aDist = Math.abs(a - currentIndex);
    const bDist = Math.abs(b - currentIndex);
    return aDist - bDist;
  });

  return toLoad;
};
