import React, { useState } from "react";
import TTSService from "../services/ttsService";
import { NARRATOR_VOICES, DIALOGUE_VOICES } from "../utils/config";

const TTSDemo: React.FC = () => {
  const [text, setText] = useState(
    'The wizard raised his staff and stepped forward. "You shall not pass!" he declared with authority. The ground trembled beneath his feet as magical energy coursed through the ancient weapon.'
  );
  const [narratorVoice, setNarratorVoice] = useState("en-US-ChristopherNeural");
  const [dialogueVoice, setDialogueVoice] = useState("en-US-AriaNeural");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAudio = async () => {
    setIsLoading(true);
    setError(null);

    // Clean up previous audio
    if (audioUrl) {
      TTSService.cleanupAudioUrl(audioUrl);
      setAudioUrl(null);
    }

    try {
      const result = await TTSService.generateDualVoiceTTS(
        text,
        narratorVoice,
        dialogueVoice
      );

      if (result.success && result.audioUrl) {
        setAudioUrl(result.audioUrl);
      } else {
        setError(result.error || "Failed to generate audio");
      }
    } catch (err) {
      setError("An error occurred while generating audio");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSamplePair = (
    narrator: string,
    dialogue: string,
    sampleText: string
  ) => {
    setNarratorVoice(narrator);
    setDialogueVoice(dialogue);
    setText(sampleText);
  };

  const recommendedPairs = TTSService.getRecommendedVoicePairs();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        🎙️ TTS Dual-Voice Demo
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Text Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Text to Convert (use quotes for dialogue)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter text with dialogue in quotes..."
            />
          </div>

          {/* Recommended Voice Pairs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Select Recommended Pairs
            </label>
            <div className="grid grid-cols-1 gap-2">
              {recommendedPairs.map((pair, index) => (
                <button
                  key={index}
                  onClick={() =>
                    selectSamplePair(pair.narrator, pair.dialogue, pair.sample)
                  }
                  className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {pair.description}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    "{pair.sample}"
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Voice Selection and Controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              👨 Narrator Voice (for narrative text)
            </label>
            <select
              value={narratorVoice}
              onChange={(e) => setNarratorVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <optgroup label="👨 Male Voices (Recommended)">
                {NARRATOR_VOICES.map((voice) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="👩 Female Voices">
                {DIALOGUE_VOICES.map((voice) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              👩 Dialogue Voice (for quoted text)
            </label>
            <select
              value={dialogueVoice}
              onChange={(e) => setDialogueVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <optgroup label="👩 Female Voices (Recommended)">
                {DIALOGUE_VOICES.map((voice) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="👨 Male Voices">
                {NARRATOR_VOICES.map((voice) => (
                  <option key={voice.value} value={voice.value}>
                    {voice.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            onClick={generateAudio}
            disabled={isLoading || !text.trim()}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating Audio...
              </div>
            ) : (
              "🎙️ Generate Dual-Voice Audio"
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {audioUrl && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                ✅ Audio Generated Successfully
              </div>
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>

      {/* API Info */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          📋 API Information
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>
            <strong>Endpoint:</strong> POST /tts-dual-voice
          </p>
          <p>
            <strong>Features:</strong> Automatic dialogue detection, dual voice
            processing
          </p>
          <p>
            <strong>Current Selection:</strong> {narratorVoice} (narrator) +{" "}
            {dialogueVoice} (dialogue)
          </p>
        </div>
      </div>
    </div>
  );
};

export default TTSDemo;
