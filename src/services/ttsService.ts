import { generateTts, generateDualVoiceTts, generateChapterAudio } from '../services/api';

/**
 * TTS Service for handling text-to-speech functionality
 * Supports both single-voice and dual-voice TTS generation
 */
export class TTSService {
  
  /**
   * Generate dual-voice TTS for text with narrative and dialogue voices
   * Automatically detects dialogue within quotes and applies appropriate voices
   */
  static async generateDualVoiceTTS(
    text: string, 
    narratorVoice: string = 'en-US-ChristopherNeural', 
    dialogueVoice: string = 'en-US-AriaNeural'
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      const audioBlob = await generateDualVoiceTts({
        text,
        paragraphVoice: narratorVoice,
        dialogueVoice: dialogueVoice
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    } catch (error) {
      console.error('Dual-voice TTS generation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate dual-voice audio' 
      };
    }
  }

  /**
   * Generate single-voice TTS for simple text conversion
   */
  static async generateSingleVoiceTTS(
    text: string, 
    voice: string = 'en-US-ChristopherNeural'
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      const audioBlob = await generateTts({ text, voice });
      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    } catch (error) {
      console.error('Single-voice TTS generation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate audio' 
      };
    }
  }

  /**
   * Generate TTS for an entire novel chapter with dual voices
   */
  static async generateChapterTTS(
    novelName: string,
    chapterNumber: number,
    narratorVoice: string = 'en-US-ChristopherNeural',
    dialogueVoice: string = 'en-US-AriaNeural'
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      const audioBlob = await generateChapterAudio(
        novelName, 
        chapterNumber, 
        narratorVoice, 
        dialogueVoice
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    } catch (error) {
      console.error('Chapter TTS generation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate chapter audio' 
      };
    }
  }

  /**
   * Detect if text contains dialogue (text within quotes)
   */
  static hasDialogue(text: string): boolean {
    return /["'].+?["']/.test(text);
  }

  /**
   * Clean up audio URL to prevent memory leaks
   */
  static cleanupAudioUrl(audioUrl: string): void {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
  }

  /**
   * Get recommended voice pairs for optimal contrast
   */
  static getRecommendedVoicePairs() {
    return [
      { 
        narrator: 'en-US-ChristopherNeural', 
        dialogue: 'en-US-AriaNeural', 
        description: 'Deep Male + Expressive Female',
        sample: 'The hero walked forward. "I won\'t give up," he declared.'
      },
      { 
        narrator: 'en-US-EricNeural', 
        dialogue: 'en-US-JennyNeural', 
        description: 'Warm Male + Clear Female',
        sample: 'She smiled warmly. "Everything will be alright," she whispered.'
      },
      { 
        narrator: 'en-US-GuyNeural', 
        dialogue: 'en-US-MichelleNeural', 
        description: 'Professional Male + Engaging Female',
        sample: 'The professor explained carefully. "This is how it works," he said.'
      },
      { 
        narrator: 'en-US-RogerNeural', 
        dialogue: 'en-US-SaraNeural', 
        description: 'Mature Male + Pleasant Female',
        sample: 'The old man nodded. "I remember those days," he murmured.'
      }
    ];
  }
}

export default TTSService;
