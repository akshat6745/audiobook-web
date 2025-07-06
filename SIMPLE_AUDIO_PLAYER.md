# Simple Audio Player

A lightweight audio player component built with Howler.js for playing short paragraph audio clips with automatic preloading and seamless transitions.

## Features

### Audio Management
- **Howler.js Integration**: Built on the robust Howler.js library for reliable cross-browser audio support
- **Intelligent Preloading**: Uses the same smart preloading algorithm as the main AudioPlayer, loading paragraphs until 1500+ characters are cached
- **Duplicate Prevention**: Loading tracker prevents the same paragraph from being requested multiple times
- **Memory Efficient**: Intelligent caching system that cleans up unused audio to save memory
- **Auto-advance**: Automatically plays the next paragraph when the current one finishes

### User Experience
- **Clean Interface**: Minimal, focused design that doesn't distract from content
- **Real-time Progress**: Live progress bar and time display
- **Loading Indicators**: Clear feedback when audio is being generated or loaded
- **Responsive Controls**: Play/pause, previous/next navigation with proper disabled states
- **Variable Speed**: Playback speed control (cycles through 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×)
- **Continuous Playback**: Audio continues playing when navigating between paragraphs

## Usage

```tsx
import SimpleAudioPlayer from "./components/SimpleAudioPlayer";

const paragraphs = [
  { text: "First paragraph content...", index: 0 },
  { text: "Second paragraph content...", index: 1 },
  // ... more paragraphs
];

<SimpleAudioPlayer
  paragraphs={paragraphs}
  currentParagraphIndex={currentIndex}
  onParagraphChange={handleParagraphChange}
  onClose={handleClose}
  isVisible={isPlayerVisible}
  narratorVoice="optional-narrator-voice"
  dialogueVoice="optional-dialogue-voice"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `paragraphs` | `Paragraph[]` | Yes | Array of paragraph objects with text and index |
| `currentParagraphIndex` | `number` | Yes | Index of the currently active paragraph |
| `onParagraphChange` | `(index: number) => void` | Yes | Callback when user navigates to different paragraph |
| `onClose` | `() => void` | Yes | Callback when user closes the player |
| `isVisible` | `boolean` | Yes | Controls player visibility |
| `narratorVoice` | `string` | No | Voice to use for narrator text (defaults to system default) |
| `dialogueVoice` | `string` | No | Voice to use for dialogue text (defaults to system default) |

## Demo

You can test the SimpleAudioPlayer by visiting `/simple-player-demo` in your browser. The demo includes:

- Sample paragraphs with different content
- Interactive controls to test all functionality
- Visual feedback for loading states
- Documentation of all features

## Technical Implementation

### Audio Caching
The player maintains an intelligent cache that:
- Stores Howl instances for loaded paragraphs
- Tracks loading states to prevent duplicate requests
- Automatically cleans up unused audio to prevent memory leaks

### Preloading Strategy
- Current paragraph is loaded with highest priority
- Additional paragraphs are preloaded until 1500+ characters are cached
- Audio generation happens asynchronously using the existing TTS service
- Loading tracker prevents duplicate API calls for the same paragraph

### State Management
- Uses React hooks for clean state management
- Proper cleanup on component unmount
- Progress tracking with regular updates

## Dependencies

- **howler**: Audio playback library
- **@types/howler**: TypeScript definitions
- **@mui/icons-material**: Icons for player controls

## Comparison with Existing AudioPlayer

| Feature | SimpleAudioPlayer | Original AudioPlayer |
|---------|-------------------|---------------------|
| Library | Howler.js | HTML5 Audio |
| Interface | Minimal, focused | Full-featured with expandable settings |
| Preloading | Next paragraph only | Aggressive range preloading |
| Memory Usage | Lower (targeted cleanup) | Higher (larger cache) |
| Voice Controls | Props-based | Built-in UI controls |
| Draggable | No | Yes |
| Complexity | Low | High |

## When to Use

**Use SimpleAudioPlayer when:**
- You need a lightweight, focused audio experience
- Memory usage is a concern
- You have external voice/settings controls
- You want a fixed-position player

**Use Original AudioPlayer when:**
- You need full-featured controls and settings
- Draggable positioning is important
- You want built-in voice selection UI
- Advanced preloading strategies are beneficial
