import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

interface ExtensionSettings {
  enabled: boolean;
  confidence: number;
}

interface DetectionStats {
  totalDetected: number;
  totalFiltered: number;
  recentDetections: Array<{
    id: string;
    text: string;
    confidence: number;
    timestamp: number;
    keywords: string[];
  }>;
}

interface FeedbackStats {
  totalFeedback: number;
  falsePositives: number;
  falseNegatives: number;
  correctClassifications: number;
  accuracy: number;
  recentFeedback: Array<{
    id: string;
    originalText: string;
    classification: {
      label: 'hateful' | 'normal';
      confidence: number;
      method: 'ai';
    };
    userFeedback: {
      type: 'false_positive' | 'false_negative' | 'correct';
      reason?: string;
      category?: string;
    };
    timestamp: number;
  }>;
}

const SidePanel: React.FC = () => {
  console.log('SidePanel component initializing...');
  
  const [settings, setSettings] = useState<ExtensionSettings>({
    enabled: true,
    confidence: 0.7
  });

  const [stats, setStats] = useState<DetectionStats>({
    totalDetected: 0,
    totalFiltered: 0,
    recentDetections: []
  });

  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats>({
    totalFeedback: 0,
    falsePositives: 0,
    falseNegatives: 0,
    correctClassifications: 0,
    accuracy: 0,
    recentFeedback: []
  });

  useEffect(() => {
    console.log('SidePanel useEffect running...');
    loadSettings();
    loadStats();
    loadFeedbackStats();
    setupMessageListener();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('SidePanel: Loading settings...');
      const result = await chrome.storage.sync.get(['enabled', 'confidence']);
      console.log('SidePanel: Settings result:', result);
      setSettings({
        enabled: result.enabled ?? true,
        confidence: result.confidence ?? 0.7
      });
    } catch (error) {
      console.error('SidePanel: Error loading settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      console.log('SidePanel: Loading stats...');
      const result = await chrome.storage.local.get(['stats', 'recentDetections']);
      console.log('SidePanel: Stats result:', result);
      setStats({
        totalDetected: result.stats?.detected ?? 0,
        totalFiltered: result.stats?.filtered ?? 0,
        recentDetections: result.recentDetections ?? []
      });
    } catch (error) {
      console.error('SidePanel: Error loading stats:', error);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      console.log('SidePanel: Loading feedback stats...');
      const response = await chrome.runtime.sendMessage({ action: 'getFeedbackStats' });
      console.log('SidePanel: Feedback stats response:', response);
      if (response && response.success && response.stats) {
        setFeedbackStats(response.stats);
      }
    } catch (error) {
      console.error('SidePanel: Error loading feedback stats:', error);
    }
  };

  const setupMessageListener = () => {
    console.log('SidePanel: Setting up message listener...');
    chrome.runtime.onMessage.addListener((message) => {
      console.log('SidePanel: Received message:', message);
      if (message.action === 'statsUpdated') {
        console.log('SidePanel: Stats updated, reloading...');
        loadStats();
      } else if (message.action === 'feedbackUpdated') {
        console.log('SidePanel: Feedback updated, reloading...');
        loadFeedbackStats();
      }
    });
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

  const clearStats = async () => {
    try {
      await chrome.storage.local.set({
        stats: { detected: 0, filtered: 0 },
        recentDetections: []
      });
      setStats({
        totalDetected: 0,
        totalFiltered: 0,
        recentDetections: []
      });
      
      // Notify background script
      chrome.runtime.sendMessage({ action: 'clearStats' });
    } catch (error) {
      console.error('Error clearing stats:', error);
    }
  };

  const exportData = () => {
    const exportData = {
      settings,
      stats,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-hg-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFeedbackData = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'exportFeedback' });
      if (response && response.success && response.data) {
        const blob = new Blob([response.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sentinel-hg-feedback-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting feedback data:', error);
    }
  };

  const clearFeedbackData = async () => {
    if (confirm('Are you sure you want to clear all feedback data? This action cannot be undone.')) {
      try {
        await chrome.runtime.sendMessage({ action: 'clearFeedback' });
        loadFeedbackStats();
      } catch (error) {
        console.error('Error clearing feedback data:', error);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="sidepanel-container">
      <header className="sidepanel-header">
        <div className="logo">
          <div className="logo-icon">🛡️</div>
          <h1>Sentinel HG</h1>
        </div>
        <p className="subtitle">Hate Speech Filter</p>
      </header>

      <main className="sidepanel-main">
        {/* Settings Section */}
        <section className="settings-section">
          <h3>Settings</h3>
          
          <div className="setting-item">
            <label className="setting-label">Enable Extension</label>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="sidepanelToggle"
                className="toggle-input"
                checked={settings.enabled}
                onChange={(e) => handleToggleChange(e.target.checked)}
              />
              <label htmlFor="sidepanelToggle" className="toggle-slider"></label>
            </div>
          </div>

          <div className="setting-item">
            <label className="setting-label">
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
        </section>

        {/* Statistics Section */}
        <section className="stats-section">
          <h3>Statistics</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalDetected}</div>
              <div className="stat-label">Detected</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalFiltered}</div>
              <div className="stat-label">Filtered</div>
            </div>
          </div>

          <div className="stats-actions">
            <button onClick={clearStats} className="action-button secondary">
              Clear Stats
            </button>
            <button onClick={exportData} className="action-button secondary">
              Export Data
            </button>
          </div>
        </section>

        {/* Feedback Statistics Section */}
        <section className="feedback-stats-section">
          <h3>Feedback Statistics</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{feedbackStats.totalFeedback}</div>
              <div className="stat-label">Total Feedback</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{Math.round(feedbackStats.accuracy * 100)}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
          </div>

          <div className="feedback-breakdown">
            <div className="feedback-item">
              <span className="feedback-label">✅ Correct:</span>
              <span className="feedback-count">{feedbackStats.correctClassifications}</span>
            </div>
            <div className="feedback-item">
              <span className="feedback-label">❌ False Positives:</span>
              <span className="feedback-count">{feedbackStats.falsePositives}</span>
            </div>
            <div className="feedback-item">
              <span className="feedback-label">⚠️ False Negatives:</span>
              <span className="feedback-count">{feedbackStats.falseNegatives}</span>
            </div>
          </div>

          <div className="stats-actions">
            <button onClick={exportFeedbackData} className="action-button secondary">
              Export Feedback
            </button>
            <button onClick={clearFeedbackData} className="action-button secondary">
              Clear Feedback
            </button>
          </div>
        </section>

        {/* Recent Detections Section */}
        <section className="detections-section">
          <h3>Recent Detections</h3>
          
          {stats.recentDetections.length === 0 ? (
            <p className="no-detections">No recent detections</p>
          ) : (
            <div className="detections-list">
              {stats.recentDetections.slice(0, 10).map((detection) => (
                <div key={detection.id} className="detection-item">
                  <div className="detection-header">
                    <span className="detection-time">
                      {formatTime(detection.timestamp)}
                    </span>
                    <span className="detection-confidence">
                      {Math.round(detection.confidence * 100)}%
                    </span>
                  </div>
                  <div className="detection-text">
                    {truncateText(detection.text)}
                  </div>
                  {detection.keywords.length > 0 && (
                    <div className="detection-keywords">
                      Keywords: {detection.keywords.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
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
    height: 100vh;
    overflow: hidden;
  }

  .sidepanel-container {
    width: 100%;
    height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidepanel-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    text-align: center;
    flex-shrink: 0;
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

  .sidepanel-main {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  section {
    margin-bottom: 30px;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #495057;
    margin-bottom: 15px;
    border-bottom: 2px solid #e9ecef;
    padding-bottom: 8px;
  }

  .setting-item {
    margin-bottom: 20px;
  }

  .setting-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #495057;
    margin-bottom: 8px;
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

  .confidence-range {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #6c757d;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #e9ecef;
  }

  .stat-number {
    font-size: 24px;
    font-weight: 700;
    color: #667eea;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 12px;
    color: #6c757d;
    font-weight: 500;
  }

  .stats-actions {
    display: flex;
    gap: 10px;
  }

  .action-button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .action-button.secondary {
    background: #6c757d;
    color: white;
  }

  .action-button.secondary:hover {
    background: #5a6268;
  }

  .detections-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .detection-item {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
  }

  .detection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .detection-time {
    font-size: 12px;
    color: #6c757d;
  }

  .detection-confidence {
    font-size: 12px;
    font-weight: 600;
    color: #dc3545;
    background: #f8d7da;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .detection-text {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .detection-keywords {
    font-size: 12px;
    color: #6c757d;
    font-style: italic;
  }

  .no-detections {
    text-align: center;
    color: #6c757d;
    font-style: italic;
    padding: 20px;
  }

  .feedback-breakdown {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
  }

  .feedback-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e9ecef;
  }

  .feedback-item:last-child {
    border-bottom: none;
  }

  .feedback-label {
    font-size: 14px;
    color: #495057;
  }

  .feedback-count {
    font-size: 14px;
    font-weight: 600;
    color: #667eea;
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Render the side panel
const container = document.getElementById('root');
console.log('SidePanel: Looking for root container:', container);
if (container) {
  console.log('SidePanel: Root container found, creating React root...');
  const root = createRoot(container);
  console.log('SidePanel: Rendering SidePanel component...');
  root.render(<SidePanel />);
  console.log('SidePanel: Component rendered successfully');
} else {
  console.error('SidePanel: Root container not found!');
} 