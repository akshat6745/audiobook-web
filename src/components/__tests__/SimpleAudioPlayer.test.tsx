import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SimpleAudioPlayer from "../SimpleAudioPlayer";
import { Paragraph } from "../../types";

// Mock the audio player utils
jest.mock("../../utils/audioPlayerUtils", () => ({
  initializeEnhancedParagraphs: jest.fn((paragraphs) =>
    paragraphs.map((p: any, index: number) => ({
      ...p,
      audioData: null,
      audioBlob: null,
      isLoading: false,
      errors: null,
    }))
  ),
  cleanupAudioUrls: jest.fn(),
  clearAudioDataForVoiceChange: jest.fn((paragraphs) => paragraphs),
  calculateNextSpeed: jest.fn(() => 1.25),
  generateAudioForParagraph: jest.fn(),
  updateParagraphInList: jest.fn((prev, index, updates) =>
    prev.map((p: any, i: number) => (i === index ? { ...p, ...updates } : p))
  ),
  MIN_CHARACTERS: 1000,
}));

// Mock the TTS service
jest.mock("../../services/ttsService", () => ({
  __esModule: true,
  default: {
    generateSpeech: jest.fn(),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock HTMLAudioElement
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  readyState: 4,
  src: "",
};

Object.defineProperty(global.HTMLAudioElement.prototype, "play", {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

const mockParagraphs: Paragraph[] = [
  {
    text: "This is the first paragraph of the test content.",
    index: 0,
  },
  {
    text: "This is the second paragraph with more content.",
    index: 1,
  },
  {
    text: "This is the third and final paragraph.",
    index: 2,
  },
];

describe("SimpleAudioPlayer", () => {
  const defaultProps = {
    paragraphs: mockParagraphs,
    currentParagraphIndex: 0,
    onParagraphChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the audio element creation
    jest.spyOn(React, "useRef").mockReturnValue({ current: mockAudio });
  });

  it("renders audio player with play button", () => {
    render(<SimpleAudioPlayer {...defaultProps} />);
    
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });

  it("shows current paragraph information", () => {
    render(<SimpleAudioPlayer {...defaultProps} />);
    
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText(mockParagraphs[0].text)).toBeInTheDocument();
  });

  it("displays previous and next buttons", () => {
    render(<SimpleAudioPlayer {...defaultProps} />);
    
    const prevButton = screen.getByLabelText(/skip previous/i);
    const nextButton = screen.getByLabelText(/skip next/i);
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
    
    // Previous button should be disabled when at first paragraph
    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();
  });

  it("shows speed control button", () => {
    render(<SimpleAudioPlayer {...defaultProps} />);
    
    const speedButton = screen.getByText("1×");
    expect(speedButton).toBeInTheDocument();
  });

  it("displays voice selection dropdowns", () => {
    render(<SimpleAudioPlayer {...defaultProps} />);
    
    expect(screen.getByLabelText(/narrator voice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dialogue voice/i)).toBeInTheDocument();
  });

  it("calls onParagraphChange when next button is clicked", () => {
    const onParagraphChange = jest.fn();
    render(
      <SimpleAudioPlayer 
        {...defaultProps} 
        onParagraphChange={onParagraphChange}
      />
    );
    
    const nextButton = screen.getByLabelText(/skip next/i);
    fireEvent.click(nextButton);
    
    expect(onParagraphChange).toHaveBeenCalledWith(1);
  });

  it("calls onParagraphChange when previous button is clicked", () => {
    const onParagraphChange = jest.fn();
    render(
      <SimpleAudioPlayer 
        {...defaultProps}
        currentParagraphIndex={1}
        onParagraphChange={onParagraphChange}
      />
    );
    
    const prevButton = screen.getByLabelText(/skip previous/i);
    fireEvent.click(prevButton);
    
    expect(onParagraphChange).toHaveBeenCalledWith(0);
  });

  it("disables next button on last paragraph", () => {
    render(
      <SimpleAudioPlayer 
        {...defaultProps}
        currentParagraphIndex={2}
      />
    );
    
    const nextButton = screen.getByLabelText(/skip next/i);
    expect(nextButton).toBeDisabled();
  });

  it("shows current paragraph text in preview section", () => {
    render(<SimpleAudioPlayer {...defaultProps} />);
    
    expect(screen.getByText("Current Paragraph")).toBeInTheDocument();
    expect(screen.getByText(mockParagraphs[0].text)).toBeInTheDocument();
  });
});
