// Background service worker for Sentinel HG extension
interface ExtensionSettings {
  enabled: boolean;
  confidence: number;
}

interface ClassificationResult {
  label: 'hateful' | 'normal';
  confidence: number;
  keywords: string[];
  explanation: string;
}

interface ClassificationRequest {
  action: 'classifyText';
  text: string;
  elementId: string;
}

interface ClassificationResponse {
  success: boolean;
  classification?: ClassificationResult;
  elementId: string;
  error?: string;
  originalText?: string;
}

class BackgroundServiceWorker {
  private settings: ExtensionSettings = {
    enabled: true,
    confidence: 0.7
  };

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.setupMessageRouter();
    console.log('Sentinel HG background service worker initialized');
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['enabled', 'confidence']);
      this.settings.enabled = result.enabled ?? true;
      this.settings.confidence = result.confidence ?? 0.7;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private setupMessageRouter(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(
    message: any,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (message.action) {
        case 'classifyText':
          await this.handleClassificationRequest(message, sendResponse);
          break;
        case 'updateSettings':
          await this.handleSettingsUpdate(message, sendResponse);
          break;
        case 'getSettings':
          sendResponse({ settings: this.settings });
          break;
        default:
          console.log('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleClassificationRequest(
    message: ClassificationRequest,
    sendResponse: (response: ClassificationResponse) => void
  ): Promise<void> {
    const { text, elementId } = message;
    
    if (!text || typeof text !== 'string') {
      sendResponse({
        success: false,
        error: 'Invalid text provided',
        elementId
      });
      return;
    }

    console.log('Classifying text:', text.substring(0, 100) + '...');
    
    const classification = this.classifyText(text);
    
    sendResponse({
      success: true,
      classification,
      elementId,
      originalText: text
    });
  }

  private async handleSettingsUpdate(
    message: { settings: Partial<ExtensionSettings> },
    sendResponse: (response: any) => void
  ): Promise<void> {
    this.settings = { ...this.settings, ...message.settings };
    await this.saveSettings();
    sendResponse({ success: true });
  }

  private classifyText(text: string): ClassificationResult {
    // Simple keyword-based classification
    const hateKeywords = [
      'idiot', 'stupid', 'hate', 'awful', 'terrible', 'horrible',
      'disgusting', 'vile', 'scum', 'trash', 'worthless', 'useless',
      'dumb', 'moron', 'retard', 'fool', 'imbecile', 'cretin'
    ];

    const lowerText = text.toLowerCase();
    const foundKeywords = hateKeywords.filter(keyword => 
      lowerText.includes(keyword)
    );

    if (foundKeywords.length > 0) {
      const confidence = Math.min(0.95, 0.5 + (foundKeywords.length * 0.1));
      
      // Only classify as hateful if confidence meets threshold
      if (confidence >= this.settings.confidence) {
        return {
          label: 'hateful',
          confidence,
          keywords: foundKeywords,
          explanation: `Detected hate speech keywords: ${foundKeywords.join(', ')}`
        };
      }
    }

    return {
      label: 'normal',
      confidence: 0.8,
      keywords: [],
      explanation: 'No hate speech keywords detected'
    };
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        enabled: this.settings.enabled,
        confidence: this.settings.confidence
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
}

// Initialize the background service worker
new BackgroundServiceWorker(); 