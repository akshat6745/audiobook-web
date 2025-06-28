# Audiobook Web Application

A modern React TypeScript application for reading and listening to audiobooks with text-to-speech functionality.

## Features

- 📚 Upload and manage EPUB files
- 🔊 Text-to-speech with dual voice support
- 📖 Chapter-based navigation
- 🎵 Audio player with playback controls
- 🎨 Modern UI with Tailwind CSS
- 🔐 Authentication system

## Project Structure

```
/audiobook-web
|-- /src
|   |-- /components
|   |   |-- AudioPlayer.tsx
|   |   |-- ChapterContent.tsx
|   |   |-- ChapterList.tsx
|   |   |-- EpubUpload.tsx
|   |   |-- LoadingSpinner.tsx
|   |   |-- Navigation.tsx
|   |   |-- NovelCard.tsx
|   |   |-- TTSDemo.tsx
|   |-- /pages
|   |   |-- ChapterContentPage.tsx
|   |   |-- ChaptersPage.tsx
|   |   |-- LoginPage.tsx
|   |   |-- NovelsPage.tsx
|   |-- /services
|   |   |-- api.ts
|   |   |-- ttsService.ts
|   |-- /hooks
|   |   |-- useAuth.ts
|   |-- /types
|   |   |-- index.ts
|   |-- /utils
|   |   |-- audioPlayerUtils.ts
|   |   |-- config.ts
|   |-- /styles
|   |   |-- components.css
|   |   |-- globals.css
|   |   |-- modern-components.css
|   |-- App.tsx
|   |-- index.tsx
```

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd audiobook-web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Technologies Used

- **React 18** with TypeScript
- **React Router Dom 6** for navigation
- **Material-UI** for UI components
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Heroicons** for icons

## Development

### Running the Application

Start the development server:

```bash
npm start
```

The application will run on `http://localhost:5000`.

### Building for Production

Create a production build:

```bash
npm run build
```

### Running Tests

Execute the test suite:

```bash
npm test
```

## Key Components

### AudioPlayer
Advanced audio player component with:
- Play/pause controls
- Progress tracking
- Chapter navigation
- Volume control

### EpubUpload
File upload component for EPUB files with:
- Drag and drop support
- File validation
- Upload progress

### ChapterContent
Displays chapter text with:
- Text-to-speech integration
- Reading progress tracking
- Responsive design

### TTSDemo
Text-to-speech demonstration with:
- Dual voice support
- Customizable speech settings
- Real-time audio generation

## API Services

### api.ts
Core API service for:
- Novel management
- Chapter operations
- User authentication
- File uploads

### ttsService.ts
Text-to-speech service handling:
- Audio generation
- Voice selection
- Speech synthesis

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## License

This project is licensed under the MIT License.