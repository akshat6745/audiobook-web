# Audio Player API Updates - TTS Dual-Voice Integration

## Overview

The audio player has been updated to integrate with the TTS Dual-Voice API, providing a more engaging audiobook experience with separate voices for narrative content and dialogue.

## Key Changes Made

### 1. Type Definitions (`src/types/index.ts`)
- Added `DualVoiceTtsRequest` interface for dual-voice TTS requests
- Maintains backward compatibility with existing `TtsRequest` interface

### 2. API Service (`src/services/api.ts`)
- Added `generateDualVoiceTts()` function for dual-voice TTS
- Added `generateChapterAudio()` function for full chapter TTS with dual voices
- Existing `generateTts()` function preserved for backward compatibility

### 3. Voice Configuration (`src/utils/config.ts`)
- Updated voice options to match API guide recommendations
- Added separate `NARRATOR_VOICES` and `DIALOGUE_VOICES` arrays
- Added default voice constants and helper functions for voice pairing
- Organized voices by gender and suitability for different content types

### 4. TTS Service (`src/services/ttsService.ts`) - New File
- Comprehensive service class for all TTS functionality
- Supports both single-voice and dual-voice TTS
- Includes dialogue detection and audio cleanup utilities
- Provides recommended voice pairs for optimal contrast

### 5. Audio Player Utils (`src/utils/audioPlayerUtils.ts`)
- Updated to use the new TTSService for dual-voice functionality
- Enhanced audio cleanup using the service's cleanup methods

### 6. Audio Player Component (`src/components/AudioPlayer.tsx`)
- Enhanced UI with separate narrator and dialogue voice selection
- Added visual indicators for paragraphs containing dialogue
- Improved voice selection with categorized options (male/female)
- Better user guidance with recommended voice types

### 7. Demo Component (`src/components/TTSDemo.tsx`) - New File
- Comprehensive demo showcasing dual-voice TTS functionality
- Interactive voice pair selection
- Sample texts demonstrating dialogue detection
- Real-time API testing interface

## API Endpoints Used

### 1. Dual-Voice TTS
```
POST /tts-dual-voice
Content-Type: application/json

{
  "text": "The hero walked forward. \"I won't give up,\" he declared.",
  "paragraphVoice": "en-US-ChristopherNeural",
  "dialogueVoice": "en-US-AriaNeural"
}
```

### 2. Chapter Audio Generation
```
GET /novel-with-tts?novelName=sample-novel&chapterNumber=1&voice=en-US-ChristopherNeural&dialogueVoice=en-US-AriaNeural
```

## Voice Options

### Narrator Voices (Male - Recommended)
- **Christopher** (Deep, Authoritative) - `en-US-ChristopherNeural`
- **Eric** (Warm, Friendly) - `en-US-EricNeural`
- **Guy** (Clear, Professional) - `en-US-GuyNeural`
- **Roger** (Mature, Storytelling) - `en-US-RogerNeural`
- **Davis** (Professional) - `en-US-DavisNeural`
- **Jason** (Casual) - `en-US-JasonNeural`

### Dialogue Voices (Female - Recommended)
- **Aria** (Natural, Expressive) - `en-US-AriaNeural`
- **Jenny** (Clear, Versatile) - `en-US-JennyNeural`
- **Michelle** (Warm, Engaging) - `en-US-MichelleNeural`
- **Sara** (Smooth, Pleasant) - `en-US-SaraNeural`
- **Jane** (Friendly) - `en-US-JaneNeural`
- **Nancy** (Mature) - `en-US-NancyNeural`

## Features

### 1. Automatic Dialogue Detection
The system automatically detects text within quotes and applies the dialogue voice:
```
"Hello there," she said warmly.
```
- `"Hello there,"` → Dialogue Voice
- `she said warmly.` → Narrator Voice

### 2. Visual Indicators
- **Paragraph Counter**: Shows current position (e.g., "3/15")
- **Dual Voice Badge**: Purple "💬 Dual Voice" indicator when dialogue is detected
- **Voice Category Labels**: Clear labeling of narrator vs dialogue voices

### 3. Smart Voice Pairing
Recommended combinations for optimal contrast:
- Christopher (Male, Deep) + Aria (Female, Expressive)
- Eric (Male, Warm) + Jenny (Female, Clear)
- Guy (Male, Professional) + Michelle (Female, Engaging)
- Roger (Male, Mature) + Sara (Female, Pleasant)

### 4. Enhanced Error Handling
- Proper error messages for TTS failures
- Automatic cleanup of audio resources
- Retry functionality for failed requests

### 5. Memory Management
- Automatic cleanup of blob URLs to prevent memory leaks
- Efficient audio resource management
- Cleanup on voice changes and component unmount

## Usage Examples

### Basic Audio Player Usage
```tsx
import AudioPlayer from './components/AudioPlayer';

<AudioPlayer
  paragraphs={chapterParagraphs}
  currentParagraphIndex={currentIndex}
  onParagraphChange={setCurrentIndex}
  onClose={closePlayer}
  isVisible={isPlayerVisible}
/>
```

### Direct TTS Service Usage
```tsx
import TTSService from './services/ttsService';

// Generate dual-voice audio
const result = await TTSService.generateDualVoiceTTS(
  'The wizard spoke. "You shall not pass!" he declared.',
  'en-US-ChristopherNeural',  // Narrator
  'en-US-AriaNeural'          // Dialogue
);

if (result.success) {
  const audio = new Audio(result.audioUrl);
  audio.play();
}
```

### Check for Dialogue
```tsx
const hasDialogue = TTSService.hasDialogue(paragraphText);
// Returns true if text contains quoted dialogue
```

## Performance Considerations

1. **Audio Generation**: TTS processing is done server-side, so network latency affects performance
2. **Memory Usage**: Audio blobs are cleaned up automatically to prevent memory leaks
3. **Caching**: Generated audio is cached per paragraph until voice settings change
4. **Loading States**: Visual loading indicators provide user feedback during generation

## Backward Compatibility

- All existing TTS functionality remains available
- Single-voice TTS can still be used via the original `generateTts()` function
- Existing components continue to work without modification

## Testing the Integration

1. Use the `TTSDemo` component to test dual-voice functionality
2. Try different voice combinations to find optimal pairings
3. Test with various text samples containing dialogue
4. Verify audio cleanup and memory management

## Error Scenarios

Common issues and solutions:

1. **Network Errors**: Check API connectivity and endpoint availability
2. **Invalid Voice IDs**: Ensure voice IDs match the supported list
3. **Empty Text**: The system handles empty/whitespace-only text gracefully
4. **Memory Issues**: Audio URLs are automatically cleaned up

## Future Enhancements

Potential improvements for future versions:

1. **Voice Previews**: Sample audio for each voice option
2. **Custom Voice Mapping**: User-defined character-to-voice assignments
3. **Emotion Detection**: Different voices based on emotional context
4. **Speed Control**: Independent speed control for narrator and dialogue
5. **Voice Cloning**: Integration with custom voice models

## API Documentation Reference

For complete API documentation, refer to `TTS_DUAL_VOICE_API_GUIDE.md` which includes:
- Complete endpoint specifications
- Request/response examples
- Error handling patterns
- Implementation best practices
- Performance optimization tips
