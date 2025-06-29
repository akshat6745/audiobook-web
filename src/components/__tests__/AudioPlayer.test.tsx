import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AudioPlayer from "../AudioPlayer";
import { Paragraph, EnhancedParagraph } from "../../types";
import * as audioPlayerUtils from "../../utils/audioPlayerUtils";
import TTSService from "../../services/ttsService";

// Mock the TTS service since that's what actually gets called
jest.mock("../../services/ttsService", () => ({
  __esModule: true,
  default: {
    generateDualVoiceTTS: jest.fn(),
    cleanupAudioUrl: jest.fn(),
  },
}));

// Mocking icons used in the component
jest.mock("@mui/icons-material", () => ({
  PlayArrow: () => <div data-testid="play-arrow-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  SkipNext: () => <div data-testid="skip-next-icon" />,
  SkipPrevious: () => <div data-testid="skip-previous-icon" />,
  Close: () => <div data-testid="close-icon" />,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock react-draggable
jest.mock("react-draggable", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Import the mocked TTS service
const mockTTSService = TTSService as jest.Mocked<typeof TTSService>;

const createMockParagraphs = (count: number): Paragraph[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    text: `This is a much longer paragraph number ${i + 1}. It contains multiple sentences to better simulate real-world content. The purpose of this is to test the preloading logic of the audio player and ensure that it correctly fetches audio for the current paragraph and preloads for the upcoming ones based on character count, without overwhelming the network with unnecessary requests.`,
    isDialogue: false,
  }));
};

describe("AudioPlayer with longer paragraphs", () => {
  let mockParagraphs: Paragraph[];
  let onParagraphChange: jest.Mock;
  let onClose: jest.Mock;
  let mockPlay: jest.Mock;

  beforeEach(() => {
    mockParagraphs = createMockParagraphs(15);
    onParagraphChange = jest.fn();
    onClose = jest.fn();

    // Mock successful audio generation from TTS service
    mockTTSService.generateDualVoiceTTS.mockImplementation(async () => {
      const mockBlob = new Blob(["long audio data"], { type: "audio/mpeg" });
      return { success: true, audioBlob: mockBlob, audioUrl: `blob:http://localhost:3000/${mockBlob.size}` };
    });

    // Mock HTMLMediaElement methods and properties
    mockPlay = jest.fn().mockResolvedValue(undefined);
    const mockPause = jest.fn();
    const mockLoad = jest.fn();
    
    window.HTMLMediaElement.prototype.play = mockPlay;
    window.HTMLMediaElement.prototype.pause = mockPause;
    window.HTMLMediaElement.prototype.load = mockLoad;
    
    // Mock readyState to indicate audio is ready to play
    Object.defineProperty(window.HTMLMediaElement.prototype, 'readyState', {
      writable: true,
      value: 4, // HAVE_ENOUGH_DATA
    });
    
    // Mock other audio properties
    Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
      writable: true,
      value: 10,
    });
    
    Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
      writable: true,
      value: 0,
    });
    
    // Mock addEventListener to immediately trigger ready events
    const originalAddEventListener = window.HTMLMediaElement.prototype.addEventListener;
    window.HTMLMediaElement.prototype.addEventListener = jest.fn().mockImplementation(function(this: HTMLMediaElement, event: string, handler: any) {
      if (event === 'canplay' || event === 'loadeddata') {
        // Immediately call the handler to simulate audio being ready
        setTimeout(() => {
          const mockEvent = new Event(event);
          Object.defineProperty(mockEvent, 'target', { value: this });
          handler(mockEvent);
        }, 0);
      }
      return originalAddEventListener.call(this, event, handler);
    });

    // Mock createObjectURL
    global.URL.createObjectURL = jest.fn(
      (blob: Blob | MediaSource) => `blob:http://localhost:3000/${(blob as Blob).size}`,
    );
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("loads initial and preloads paragraphs, then plays audio", async () => {
    render(
      <AudioPlayer
        paragraphs={mockParagraphs}
        currentParagraphIndex={0}
        onParagraphChange={onParagraphChange}
        onClose={onClose}
        isVisible={true}
      />,
    );

    // Wait for the audio to be "loaded" for the first paragraph.
    await waitFor(() => {
      // The loading spinner should disappear and the play button should be enabled.
      expect(screen.getByTestId("play-button")).not.toBeDisabled();
    });

    // Check that the TTS service was called for audio generation
    await waitFor(() => {
      expect(mockTTSService.generateDualVoiceTTS).toHaveBeenCalled();
    });

    // Now, click the play button
    fireEvent.click(screen.getByTestId("play-button"));

    // Wait for the play action to complete
    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalled();
    });

    // Check that we're showing the pause icon after playing
    expect(screen.getByTestId("pause-icon")).toBeInTheDocument();
  });
}); 