# Sentinel HG: Explainable Hate Speech Filter

A privacy-preserving browser extension that uses client-side AI to detect and filter hate speech on social media platforms.

## 🛡️ Features

- **AI-Powered Detection**: Uses Transformers.js for advanced hate speech classification
- **Real-time Monitoring**: Monitors web pages for new content and classifies text for hate speech
- **Privacy-Preserving**: All processing happens locally - no data sent to external servers
- **Visual Filtering**: Blurs hateful content with hover-to-reveal functionality
- **Explainable AI**: Provides explanations for why content was flagged
- **Side Panel Interface**: Comprehensive dashboard with statistics and recent detections
- **Cross-Platform**: Works on Twitter/X, Facebook, Reddit, and other social media sites
- **User Control**: Simple toggle to enable/disable the extension with confidence slider
- **Modern Tech Stack**: Built with Vite, TypeScript, React, and Transformers.js

## 🚀 Installation

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/TaiwoOgunbanwo/sentinel-hg-extension-final.git
   cd sentinel-hg-extension-final
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist/` directory

5. **Start Using**
   - The extension will appear in your Chrome toolbar
   - Click the extension icon to open the popup
   - Toggle the extension on/off and adjust confidence threshold
   - Click "Open Side Panel" for detailed analytics

## 📁 Project Structure

```
sentinel-hg-extension-final/
├── src/
│   ├── background.ts      # Background service worker with AI model
│   ├── content.ts         # Content script for social sites
│   ├── popup.tsx          # React popup with controls
│   └── sidepanel.tsx      # React side panel with analytics
├── public/
│   ├── manifest.json      # Extension manifest (MV3)
│   ├── popup.html         # Popup HTML entry point
│   └── sidepanel.html     # Side panel HTML entry point
├── models/                # AI models directory
├── dist/                  # Built extension (generated)
├── vite.config.ts         # Build configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 🔧 Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension manifest format
- **Service Worker**: Background script runs as a service worker with AI model
- **Content Scripts**: Injected into supported websites for real-time monitoring
- **MutationObserver**: Efficiently detects new content on dynamic pages
- **Chrome Storage**: Settings persisted using chrome.storage.sync
- **Side Panel**: Dedicated interface for analytics and detailed controls
- **TypeScript**: Full type safety and modern JavaScript features
- **React**: Modern UI components with hooks and state management
- **Vite**: Fast build tool with hot module replacement

### AI-Powered Detection

- **Transformers.js**: Client-side AI using pre-trained models
- **Sentiment Analysis**: Uses DistilBERT model for text classification
- **Fallback System**: Keyword-based detection when AI model fails
- **Configurable Confidence**: Adjustable threshold (0.5-0.95) via slider
- **Real-time Processing**: Immediate classification of new content
- **Method Tracking**: Shows whether AI or keyword detection was used

### Build System

- **Vite**: Modern build tool with fast development and optimized production builds
- **TypeScript**: Type-safe development with strict configuration
- **React**: Component-based UI with modern hooks
- **Asset Copying**: Models directory automatically copied to dist/
- **Code Splitting**: Optimized bundle sizes for better performance

### Classification System

- **AI Model**: DistilBERT-based sentiment analysis for hate speech detection
- **Keyword Fallback**: Traditional keyword matching when AI unavailable
- **Configurable Confidence**: Adjustable threshold (50%-95%) via popup/side panel
- **Extensible**: Designed to integrate with more sophisticated AI models
- **Real-time Processing**: Immediate classification of new content

### Supported Platforms

- Twitter/X (`twitter.com`, `x.com`)
- Facebook (`facebook.com`)
- Reddit (`reddit.com`)
- Extensible to other platforms

## 🎯 Usage

1. **Enable the Extension**: Use the toggle switch in the popup
2. **Adjust Confidence**: Set detection sensitivity (50%-95%)
3. **Browse Social Media**: Visit supported platforms
4. **Automatic Detection**: The extension will monitor new content
5. **Visual Feedback**: Hateful content is automatically blurred
6. **Hover to Reveal**: Hover over blurred content to temporarily view it
7. **Explanation**: Click the warning badge for detailed classification info
8. **Side Panel**: Open side panel for comprehensive analytics and controls

## 📊 Side Panel Features

- **Real-time Statistics**: Live count of detected and filtered content
- **Recent Detections**: List of recently flagged content with timestamps
- **Settings Management**: Toggle extension and adjust confidence
- **Data Export**: Export settings and statistics as JSON
- **Detection History**: View detailed information about each detection
- **Method Tracking**: See whether AI or keyword detection was used

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run clean        # Clean dist directory
```

### Development Workflow

1. **Make changes** to TypeScript/React files in `src/`
2. **Build the extension** with `npm run build`
3. **Reload the extension** in Chrome extensions page
4. **Test on supported sites**

### Adding AI Models

1. **Place models** in the `models/` directory
2. **Update classification logic** in `src/background.ts`
3. **Rebuild** with `npm run build`
4. **Test** the new model integration

### AI Model Integration

The extension uses Transformers.js for client-side AI processing:

```typescript
// Load AI model
const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');

// Classify text
const result = await classifier(text);
```

## 🔮 Future Enhancements

- [ ] Integration with dedicated hate speech models
- [ ] Custom keyword lists and user-defined rules
- [ ] User feedback system for model improvement
- [ ] Advanced analytics dashboard with charts
- [ ] Whitelist/blacklist functionality
- [ ] Export/import settings
- [ ] Multi-language support
- [ ] Advanced filtering options
- [ ] Model fine-tuning capabilities
- [ ] Performance optimizations

## 🤝 Contributing

This is a research prototype. For contributions or questions, please contact the development team.

## 📄 License

This project is part of academic research. All rights reserved.

## 👨‍💻 Author

**Taiwo Ogunbanwo** - [GitHub](https://github.com/TaiwoOgunbanwo)

---

*Sentinel HG: Protecting users from hate speech, one post at a time.*
