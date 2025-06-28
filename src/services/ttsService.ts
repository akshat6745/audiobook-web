import { generateDualVoiceTts, generateChapterAudio } from "../services/api";

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
    narratorVoice: string = "en-US-ChristopherNeural",
    dialogueVoice: string = "en-US-AriaNeural",
  ): Promise<{
    success: boolean;
    audioUrl?: string;
    audioBlob?: Blob;
    error?: string;
  }> {
    try {
      const audioBlob = await generateDualVoiceTts({
        text,
        paragraphVoice: narratorVoice,
        dialogueVoice: dialogueVoice,
      });

      // Verify the blob is valid
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error("Received empty or invalid audio blob");
      }

      // Verify the blob is an audio file
      if (!audioBlob.type || !audioBlob.type.startsWith("audio/")) {
        console.warn("Received blob with non-audio type:", audioBlob.type);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log(
        "Created blob URL:",
        audioUrl,
        "Size:",
        audioBlob.size,
        "Type:",
        audioBlob.type,
      );

      return { success: true, audioUrl, audioBlob };
    } catch (error) {
      console.error("Dual-voice TTS generation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate dual-voice audio",
      };
    }
  }

  /**
   * Generate TTS for an entire novel chapter with dual voices
   */
  static async generateChapterTTS(
    novelName: string,
    chapterNumber: number,
    narratorVoice: string = "en-US-ChristopherNeural",
    dialogueVoice: string = "en-US-AriaNeural",
  ): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
    try {
      const audioBlob = await generateChapterAudio(
        novelName,
        chapterNumber,
        narratorVoice,
        dialogueVoice,
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      return { success: true, audioUrl };
    } catch (error) {
      console.error("Chapter TTS generation failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate chapter audio",
      };
    }
  }

  /**
   * Clean up audio URL to prevent memory leaks
   */
  static cleanupAudioUrl(audioUrl: string): void {
    if (audioUrl && audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUrl);
    }
  }

  /**
   * Get recommended voice pairs for optimal contrast
   */
  static getRecommendedVoicePairs() {
    return [
      {
        narrator: "en-US-ChristopherNeural",
        dialogue: "en-US-AriaNeural",
        description: "Deep Male + Expressive Female",
        sample: 'The hero walked forward. "I won\'t give up," he declared.',
      },
      {
        narrator: "en-US-EricNeural",
        dialogue: "en-US-JennyNeural",
        description: "Warm Male + Clear Female",
        sample:
          'She smiled warmly. "Everything will be alright," she whispered.',
      },
      {
        narrator: "en-US-GuyNeural",
        dialogue: "en-US-MichelleNeural",
        description: "Professional Male + Engaging Female",
        sample:
          'The professor explained carefully. "This is how it works," he said.',
      },
      {
        narrator: "en-US-RogerNeural",
        dialogue: "en-US-SaraNeural",
        description: "Mature Male + Pleasant Female",
        sample: 'The old man nodded. "I remember those days," he murmured.',
      },
    ];
  }
}

export default TTSService;
