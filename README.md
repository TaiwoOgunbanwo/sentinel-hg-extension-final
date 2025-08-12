# Sentinel HG: Explainable Hate Speech Filter

A privacy-preserving browser extension that uses client-side AI to detect and filter hate speech on social media platforms.

## 🛡️ Features

- **Real-time Detection**: Monitors web pages for new content and classifies text for hate speech
- **Privacy-Preserving**: All processing happens locally - no data sent to external servers
- **Visual Filtering**: Blurs hateful content with hover-to-reveal functionality
- **Explainable AI**: Provides explanations for why content was flagged
- **Cross-Platform**: Works on Twitter/X, Facebook, Reddit, and other social media sites
- **User Control**: Simple toggle to enable/disable the extension

## 🚀 Installation

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/TaiwoOgunbanwo/sentinel-hg-extension-final.git
   cd sentinel-hg-extension-final
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension directory

3. **Start Using**
   - The extension will appear in your Chrome toolbar
   - Click the extension icon to open the popup
   - Toggle the extension on/off as needed

## 📁 Project Structure

```
sentinel-hg-extension-final/
├── manifest.json          # Extension manifest (Manifest V3)
├── src/
│   ├── background.js      # Background script for classification
│   ├── content.js         # Content script for page monitoring
│   └── popup/
│       ├── popup.html     # Extension popup interface
│       ├── popup.css      # Popup styling
│       └── popup.js       # Popup functionality
├── models/                # AI models directory (placeholder)
└── README.md             # This file
```

## 🔧 Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension manifest format
- **Service Worker**: Background script runs as a service worker
- **Content Scripts**: Injected into supported websites for real-time monitoring
- **MutationObserver**: Efficiently detects new content on dynamic pages
- **Local Storage**: Settings and state persisted using Chrome storage APIs

### Classification System

- **Keyword-based Detection**: Currently uses a simple keyword matching system
- **Extensible**: Designed to integrate with more sophisticated AI models
- **Configurable**: Sensitivity and filtering options can be adjusted

### Supported Platforms

- Twitter/X (`twitter.com`, `x.com`)
- Facebook (`facebook.com`)
- Reddit (`reddit.com`)
- Extensible to other platforms

## 🎯 Usage

1. **Enable the Extension**: Use the toggle switch in the popup
2. **Browse Social Media**: Visit supported platforms
3. **Automatic Detection**: The extension will monitor new content
4. **Visual Feedback**: Hateful content is automatically blurred
5. **Hover to Reveal**: Hover over blurred content to temporarily view it
6. **Explanation**: Click the warning badge for detailed classification info

## 🔮 Future Enhancements

- [ ] Integration with advanced AI models
- [ ] Custom keyword lists
- [ ] User feedback system
- [ ] Detailed analytics dashboard
- [ ] Whitelist/blacklist functionality
- [ ] Export/import settings

## 🤝 Contributing

This is a research prototype. For contributions or questions, please contact Taiwo Ogunbanwo (taiwoogunbanwo13@gmail.com)

## 📄 License

This project is part of academic research. All rights reserved.

## 👨‍💻 Author

**Taiwo Ogunbanwo** - [GitHub](https://github.com/TaiwoOgunbanwo)

---

*Sentinel HG: Protecting users from hate speech, one post at a time.*
