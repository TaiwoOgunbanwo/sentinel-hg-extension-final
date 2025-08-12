import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface ExtensionSettings {
  enabled: boolean;
  confidence: number;
}

const Popup: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>({
    enabled: true,
    confidence: 0.7
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.sync.get(['enabled', 'confidence']);
      setSettings({
        enabled: result.enabled ?? true,
        confidence: result.confidence ?? 0.7
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<ExtensionSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await chrome.storage.sync.set(updatedSettings);
      setSettings(updatedSettings);
      
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleToggleChange = (enabled: boolean) => {
    saveSettings({ enabled });
  };

  const handleConfidenceChange = (confidence: number) => {
    saveSettings({ confidence });
  };

  const openSidePanel = () => {
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    }
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="logo">
          <div className="logo-icon">🛡️</div>
          <h1>Sentinel HG</h1>
        </div>
        <p className="subtitle">Hate Speech Filter</p>
      </header>

      <main className="popup-main">
        <div className="toggle-section">
          <label className="toggle-label">Enable Extension</label>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="extensionToggle"
              className="toggle-input"
              checked={settings.enabled}
              onChange={(e) => handleToggleChange(e.target.checked)}
            />
            <label htmlFor="extensionToggle" className="toggle-slider"></label>
          </div>
        </div>

        <div className="confidence-section">
          <label className="confidence-label">
            Detection Confidence: {Math.round(settings.confidence * 100)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={settings.confidence}
            onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
            className="confidence-slider"
          />
          <div className="confidence-range">
            <span>50%</span>
            <span>95%</span>
          </div>
        </div>

        <div className="sidepanel-section">
          <button onClick={openSidePanel} className="sidepanel-button">
            Open Side Panel
          </button>
        </div>
      </main>
    </div>
  );
};

// Styles
const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: #f8f9fa;
    color: #333;
    min-height: 100vh;
  }

  .popup-container {
    width: 300px;
    min-height: 200px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .popup-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    text-align: center;
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo h1 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
  }

  .subtitle {
    font-size: 14px;
    opacity: 0.9;
    margin: 0;
  }

  .popup-main {
    padding: 30px 20px;
  }

  .toggle-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 0;
    margin-bottom: 20px;
  }

  .toggle-label {
    font-size: 16px;
    font-weight: 500;
    color: #495057;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
  }

  .toggle-input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 24px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-input:checked + .toggle-slider {
    background-color: #667eea;
  }

  .toggle-input:checked + .toggle-slider:before {
    transform: translateX(26px);
  }

  .toggle-input:focus + .toggle-slider {
    box-shadow: 0 0 1px #667eea;
  }

  .confidence-section {
    padding: 15px 0;
  }

  .confidence-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #495057;
    margin-bottom: 10px;
  }

  .confidence-slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #e9ecef;
    outline: none;
    -webkit-appearance: none;
    margin-bottom: 5px;
  }

  .confidence-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .confidence-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }

  .confidence-range {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #6c757d;
  }

  .sidepanel-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e9ecef;
  }

  .sidepanel-button {
    width: 100%;
    padding: 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .sidepanel-button:hover {
    background: #5a67d8;
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Render the popup
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 