import { Paragraph, EnhancedParagraph } from "../types";
import TTSService from "../services/ttsService";

export const MIN_CHARACTERS = 1500;

export const initializeEnhancedParagraphs = (
  paragraphs: Paragraph[],
): EnhancedParagraph[] => {
  return paragraphs.map((paragraph, index) => ({
    paragraphNumber: index + 1,
    text: paragraph.text,
    isLoading: false,
    audioData: null,
    audioBlob: null,
    errors: null,
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
  paragraphs: EnhancedParagraph[],
): EnhancedParagraph[] => {
  return paragraphs.map((p) => ({
    ...p,
    audioData: null, // Always set to null since we don't store URLs anymore
    audioBlob: null,
  }));
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
  dialogueVoice: string,
): Promise<{
  success: boolean;
  audioUrl?: string;
  audioBlob?: Blob;
  error?: string;
}> => {
  try {
    // Clean up previous audio URL for this paragraph
    if (paragraph.audioData) {
      TTSService.cleanupAudioUrl(paragraph.audioData);
    }

    // Use dual-voice TTS for better audiobook experience
    const result = await TTSService.generateDualVoiceTTS(
      paragraph.text,
      narratorVoice,
      dialogueVoice,
    );

    console.log("result from TTS service:", result);

    if (result.success && result.audioBlob) {
      // Don't store the blob URL in audioData - we'll create fresh ones as needed
      // Just store the blob and return a temporary URL for immediate use
      const tempUrl = URL.createObjectURL(result.audioBlob);
      console.log("Audio generated successfully, created temp blob URL:", tempUrl);
      
      return {
        success: true,
        audioUrl: tempUrl, // This is just for the return value
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
  updates: Partial<EnhancedParagraph>,
): EnhancedParagraph[] => {
  return paragraphs.map((p, i) => (i === index ? { ...p, ...updates } : p));
};
