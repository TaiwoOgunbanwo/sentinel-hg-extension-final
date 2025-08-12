// Background service worker for Sentinel HG extension
import { pipeline } from '@xenova/transformers';

interface ExtensionSettings {
  enabled: boolean;
  confidence: number;
}

interface ClassificationResult {
  label: 'hateful' | 'normal';
  confidence: number;
  keywords: string[];
  explanation: string;
  method: 'ai' | 'keyword';
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

  private classifier: any = null;
  private isModelLoaded = false;
  private isModelLoading = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.setupMessageRouter();
    this.loadAIModel();
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

  private async loadAIModel(): Promise<void> {
    if (this.isModelLoading || this.isModelLoaded) return;

    this.isModelLoading = true;
    console.log('Loading AI model...');

    try {
      // Load a pre-trained model for text classification
      // Using a smaller model for better performance in browser
      const modelName = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
      
      this.classifier = await pipeline('sentiment-analysis', modelName);
      this.isModelLoaded = true;
      console.log('AI model loaded successfully');
    } catch (error) {
      console.error('Error loading AI model:', error);
      console.log('Falling back to keyword-based detection');
    } finally {
      this.isModelLoading = false;
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
        case 'clearStats':
          await this.clearStats();
          sendResponse({ success: true });
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
    
    const classification = await this.classifyText(text);
    
    // Store detection for side panel
    if (classification.label === 'hateful') {
      await this.storeDetection(text, classification);
    }
    
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

  private async classifyText(text: string): Promise<ClassificationResult> {
    // Try AI classification first
    if (this.isModelLoaded && this.classifier) {
      try {
        const aiResult = await this.classifyWithAI(text);
        if (aiResult) {
          return aiResult;
        }
      } catch (error) {
        console.error('AI classification failed:', error);
      }
    }

    // Fallback to keyword-based classification
    return this.classifyWithKeywords(text);
  }

  private async classifyWithAI(text: string): Promise<ClassificationResult | null> {
    try {
      const result = await this.classifier(text);
      
      // The model returns sentiment analysis, we need to interpret it for hate speech
      // For now, we'll use negative sentiment as a proxy for potential hate speech
      // In a real implementation, you'd use a specifically trained hate speech model
      
      const confidence = result[0]?.score || 0;
      const label = result[0]?.label || 'NEGATIVE';
      
      // Convert sentiment to hate speech classification
      // This is a simplified approach - in production, use a dedicated hate speech model
      if (label === 'NEGATIVE' && confidence >= this.settings.confidence) {
        return {
          label: 'hateful',
          confidence: Math.min(0.95, confidence + 0.1), // Boost confidence slightly
          keywords: this.extractKeywords(text),
          explanation: `AI detected negative sentiment with ${Math.round(confidence * 100)}% confidence`,
          method: 'ai'
        };
      }
      
      return {
        label: 'normal',
        confidence: 0.8,
        keywords: [],
        explanation: 'AI classified as normal content',
        method: 'ai'
      };
    } catch (error) {
      console.error('AI classification error:', error);
      return null;
    }
  }

  private classifyWithKeywords(text: string): ClassificationResult {
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
          explanation: `Detected hate speech keywords: ${foundKeywords.join(', ')}`,
          method: 'keyword'
        };
      }
    }

    return {
      label: 'normal',
      confidence: 0.8,
      keywords: [],
      explanation: 'No hate speech keywords detected',
      method: 'keyword'
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction for AI results
    const hateKeywords = [
      'idiot', 'stupid', 'hate', 'awful', 'terrible', 'horrible',
      'disgusting', 'vile', 'scum', 'trash', 'worthless', 'useless',
      'dumb', 'moron', 'retard', 'fool', 'imbecile', 'cretin'
    ];

    const lowerText = text.toLowerCase();
    return hateKeywords.filter(keyword => lowerText.includes(keyword));
  }

  private async storeDetection(text: string, classification: ClassificationResult): Promise<void> {
    try {
      // Get existing detections
      const result = await chrome.storage.local.get(['recentDetections', 'stats']);
      const recentDetections = result.recentDetections || [];
      const stats = result.stats || { detected: 0, filtered: 0 };

      // Add new detection
      const newDetection = {
        id: `detection-${Date.now()}`,
        text: text,
        confidence: classification.confidence,
        timestamp: Date.now(),
        keywords: classification.keywords
      };

      // Update recent detections (keep last 50)
      const updatedDetections = [newDetection, ...recentDetections].slice(0, 50);

      // Update stats
      const updatedStats = {
        detected: stats.detected + 1,
        filtered: stats.filtered + 1
      };

      // Save to storage
      await chrome.storage.local.set({
        recentDetections: updatedDetections,
        stats: updatedStats
      });

      // Notify side panel
      chrome.runtime.sendMessage({ action: 'statsUpdated' });
    } catch (error) {
      console.error('Error storing detection:', error);
    }
  }

  private async clearStats(): Promise<void> {
    try {
      await chrome.storage.local.set({
        stats: { detected: 0, filtered: 0 },
        recentDetections: []
      });
    } catch (error) {
      console.error('Error clearing stats:', error);
    }
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