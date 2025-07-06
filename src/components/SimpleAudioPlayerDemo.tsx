import React, { useState } from "react";
import SimpleAudioPlayer from "../components/SimpleAudioPlayer";
import { Paragraph } from "../types";

const SimpleAudioPlayerDemo: React.FC = () => {
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);

  // Sample paragraphs for testing
  const sampleParagraphs: Paragraph[] = [
    {
      text: "This is the first paragraph. It's a short piece of text that will be converted to speech using our simple audio player.",
      index: 0,
    },
    {
      text: "Here's the second paragraph. The player should automatically advance to this paragraph when the first one finishes playing.",
      index: 1,
    },
    {
      text: "This is the third and final paragraph in our demo. You can use the navigation controls to move between paragraphs.",
      index: 2,
    },
    {
      text: "Finally, this is the fourth paragraph. It serves as a longer piece of text to demonstrate how the player handles different lengths of content.",
      index: 3,
    },
    {      text: "And this is the fifth paragraph. It continues to showcase the audio player's capabilities with a bit more content.",
      index: 4,
    },
    {
      text: "And this is the fifth paragraph. It continues to showcase the audio player's capabilities with a bit more content.",
      index: 5,
    },
    {
      text: "And this is the sixth paragraph. It adds even more content to showcase the audio player's capabilities.",
      index: 6,
    },
    {
      text: "And this is the seventh paragraph. It continues to showcase the audio player's capabilities with a bit more content.",
      index: 7,
    },
    {
      text: "And this is the eighth paragraph. It adds even more content to showcase the audio player's capabilities.",
      index: 8,
    },
    {
      text: "And this is the ninth paragraph. It continues to showcase the audio player's capabilities with a bit more content.",
      index: 9,
    },
    {
      text: "And this is the tenth paragraph. It adds even more content to showcase the audio player's capabilities.",
      index: 10,
    },
  ];

  const handleParagraphChange = (index: number) => {
    setCurrentParagraphIndex(index);
  };

  const handleClosePlayer = () => {
    setIsPlayerVisible(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Simple Audio Player Demo
        </h1>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            How to Use
          </h2>
          <ul className="text-slate-300 space-y-2">
            <li>• Click "Open Simple Audio Player" to start the demo</li>
            <li>• Use the play/pause button to control playback</li>
            <li>• Navigate between paragraphs with the previous/next buttons</li>
            <li>• Click the speed button (1×, 1.25×, 1.5×, 2×) to change playback speed</li>
            <li>• The player automatically advances to the next paragraph when one finishes</li>
            <li>• Audio is preloaded for smooth transitions</li>
            <li>• Playback continues when manually navigating between paragraphs</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Current Paragraph ({currentParagraphIndex + 1}/{sampleParagraphs.length})
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {sampleParagraphs[currentParagraphIndex]?.text}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Controls</h3>
            <div className="space-y-3">
              <button
                onClick={() => setIsPlayerVisible(!isPlayerVisible)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                  isPlayerVisible
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white"
                }`}
              >
                {isPlayerVisible ? "Close Simple Audio Player" : "Open Simple Audio Player"}
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleParagraphChange(Math.max(0, currentParagraphIndex - 1))}
                  disabled={currentParagraphIndex === 0}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
                >
                  Previous
                </button>
                
                <span className="px-3 py-2 bg-slate-700 rounded text-white text-sm text-center">
                  {currentParagraphIndex + 1} / {sampleParagraphs.length}
                </span>
                
                <button
                  onClick={() => handleParagraphChange(Math.min(sampleParagraphs.length - 1, currentParagraphIndex + 1))}
                  disabled={currentParagraphIndex === sampleParagraphs.length - 1}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
            <div>
              <h4 className="font-medium text-white mb-2">Audio Management</h4>
              <ul className="text-sm space-y-1">
                <li>• Built with Howler.js for robust audio handling</li>
                <li>• Intelligent preloading based on content length (1500+ chars)</li>
                <li>• Duplicate API call prevention with loading tracker</li>
                <li>• Memory-efficient audio caching with cleanup</li>
                <li>• Variable playback speed (0.5× to 2×)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">User Experience</h4>
              <ul className="text-sm space-y-1">
                <li>• Seamless auto-advance between paragraphs</li>
                <li>• Continuous playback when navigating</li>
                <li>• Real-time progress tracking</li>
                <li>• Loading indicators for better feedback</li>
                <li>• Clean, minimal interface</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Audio Player */}
      <SimpleAudioPlayer
        paragraphs={sampleParagraphs}
        currentParagraphIndex={currentParagraphIndex}
        onParagraphChange={handleParagraphChange}
        onClose={handleClosePlayer}
        isVisible={isPlayerVisible}
      />
    </div>
  );
};

export default SimpleAudioPlayerDemo;
