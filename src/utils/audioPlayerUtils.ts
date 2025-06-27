import { Paragraph, EnhancedParagraph } from '../types';
import { generateTts } from '../services/api';

export const initializeEnhancedParagraphs = (paragraphs: Paragraph[]): EnhancedParagraph[] => {
  return paragraphs.map((paragraph, index) => ({
    paragraphNumber: index + 1,
    text: paragraph.text,
    isLoading: false,
    audioData: null,
    errors: null
  }));
};

export const cleanupAudioUrls = (paragraphs: EnhancedParagraph[]): void => {
  paragraphs.forEach(paragraph => {
    if (paragraph.audioData) {
      URL.revokeObjectURL(paragraph.audioData);
    }
  });
};

export const clearAudioDataForVoiceChange = (paragraphs: EnhancedParagraph[]): EnhancedParagraph[] => {
  return paragraphs.map(p => ({
    ...p,
    audioData: p.audioData ? (() => { 
      URL.revokeObjectURL(p.audioData!); 
      return null; 
    })() : null
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
  selectedVoice: string
): Promise<{ success: boolean; audioUrl?: string; error?: string }> => {
  try {
    const audioBlob = await generateTts({ text: paragraph.text, voice: selectedVoice });
    
    // Clean up previous audio URL for this paragraph
    if (paragraph.audioData) {
      URL.revokeObjectURL(paragraph.audioData);
    }
    
    // Create new audio URL
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { success: true, audioUrl };
  } catch (err) {
    console.error('TTS Error:', err);
    return { success: false, error: 'Failed to generate audio. Please try again.' };
  }
};

export const updateParagraphInList = (
  paragraphs: EnhancedParagraph[],
  index: number,
  updates: Partial<EnhancedParagraph>
): EnhancedParagraph[] => {
  return paragraphs.map((p, i) => i === index ? { ...p, ...updates } : p);
};
