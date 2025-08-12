// Background service worker for Sentinel HG extension
import { pipeline } from '@xenova/transformers';
import { DEFAULT_MODEL, MODEL_LOADING_OPTIONS, preprocessText, HATE_SPEECH_MODELS, type ModelConfig } from './model-config';
import { FeedbackManager } from './feedback';

interface ExtensionSettings {
  enabled: boolean;
  confidence: number;
  selectedModel: string;
}

interface ClassificationResult {
  label: 'hateful' | 'normal';
  confidence: number;
  keywords: string[];
  explanation: string;
  method: 'ai';
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
    confidence: 0.7,
    selectedModel: DEFAULT_MODEL.modelId
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
      const result = await chrome.storage.sync.get(['enabled', 'confidence', 'selectedModel']);
      this.settings.enabled = result.enabled ?? true;
      this.settings.confidence = result.confidence ?? 0.7;
      this.settings.selectedModel = result.selectedModel ?? DEFAULT_MODEL.modelId;
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private async loadAIModel(): Promise<void> {
    if (this.isModelLoading || this.isModelLoaded) return;

    this.isModelLoading = true;
    console.log('Loading AI model for hate speech detection...');

    try {
      const modelName = this.settings.selectedModel;
      console.log('Loading AI model:', modelName);
      
      this.classifier = await pipeline('text-classification', modelName, {
        ...MODEL_LOADING_OPTIONS,
        progress_callback: (progress: number) => {
          console.log(`AI model loading progress: ${Math.round(progress * 100)}%`);
        }
      });
      
      this.isModelLoaded = true;
      console.log('AI model loaded successfully - ready for hate speech detection');
    } catch (error) {
      console.error('Error loading AI model:', error);
      console.log('AI model failed to load - extension will use default classification');
      this.isModelLoaded = false;
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
    console.log('Background: Received message:', message);
    try {
      switch (message.action) {
        case 'classifyText':
          console.log('Background: Handling classifyText request');
          await this.handleClassificationRequest(message, sendResponse);
          break;
        case 'updateSettings':
          console.log('Background: Handling updateSettings request');
          await this.handleSettingsUpdate(message, sendResponse);
          break;
        case 'getSettings':
          console.log('Background: Handling getSettings request');
          sendResponse({ settings: this.settings });
          break;
        case 'clearStats':
          console.log('Background: Handling clearStats request');
          await this.clearStats();
          sendResponse({ success: true });
          break;
        case 'openSidePanel':
          console.log('Background: Handling openSidePanel request');
          this.openSidePanel();
          sendResponse({ success: true });
          break;
        case 'submitFeedback':
          console.log('Background: Handling submitFeedback request');
          await this.handleFeedbackSubmission(message, sendResponse);
          break;
        case 'getFeedbackStats':
          console.log('Background: Handling getFeedbackStats request');
          await this.handleGetFeedbackStats(sendResponse);
          break;
        case 'exportFeedback':
          console.log('Background: Handling exportFeedback request');
          await this.handleExportFeedback(sendResponse);
          break;
        case 'clearFeedback':
          console.log('Background: Handling clearFeedback request');
          await this.handleClearFeedback(sendResponse);
          break;
        default:
          console.log('Background: Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background: Error handling message:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleClassificationRequest(
    message: ClassificationRequest,
    sendResponse: (response: ClassificationResponse) => void
  ): Promise<void> {
    console.log('Background: Received classification request:', message);
    const { text, elementId } = message;
    
    if (!text || typeof text !== 'string') {
      console.error('Background: Invalid text provided:', text);
      sendResponse({
        success: false,
        error: 'Invalid text provided',
        elementId
      });
      return;
    }

    console.log('Background: Classifying text:', text.substring(0, 100) + '...', 'for element:', elementId);
    
    try {
      const classification = await this.classifyText(text);
      
      console.log('Background: Classification result:', classification);
      
      // Store detection for side panel
      if (classification.label === 'hateful') {
        await this.storeDetection(text, classification);
      }
      
      const response = {
        success: true,
        classification,
        elementId,
        originalText: text
      };
      
      console.log('Background: Sending response:', response);
      sendResponse(response);
    } catch (error) {
      console.error('Background: Error in classification:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Classification failed',
        elementId
      });
    }
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
    // Use AI classification only
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

    // If AI model is not available, return a default result
    console.warn('AI model not available, returning default classification');
    return {
      label: 'normal',
      confidence: 0.5,
      keywords: [],
      explanation: 'AI model not available - defaulting to normal classification',
      method: 'ai'
    };
  }

  private async classifyWithAI(text: string): Promise<ClassificationResult | null> {
    try {
      // Preprocess the text for AI analysis
      const processedText = preprocessText(text);
      console.log('AI: Analyzing text for hate speech:', processedText.substring(0, 100) + '...');
      
      const result = await this.classifier(processedText);
      console.log('AI: Classification result:', result);
      
      // Get the current model configuration
      const modelConfig = this.getCurrentModelConfig();
      
      let maxConfidence = 0;
      let detectedLabel = 'normal';
      let isHateful = false;
      
      // Process all classification results
      if (Array.isArray(result)) {
        for (const classification of result) {
          const label = classification.label?.toLowerCase() || '';
          const confidence = classification.score || 0;
          
          console.log('AI: Processing classification:', { label, confidence });
          
          // Check if this is a hate speech label
          if (modelConfig.labels.hateful.some(hateLabel => label.includes(hateLabel))) {
            if (confidence > maxConfidence) {
              maxConfidence = confidence;
              detectedLabel = label;
              isHateful = true;
            }
          }
          
          // Check if this is a normal label
          if (modelConfig.labels.normal.some(normalLabel => label.includes(normalLabel))) {
            if (confidence > maxConfidence && !isHateful) {
              maxConfidence = confidence;
              detectedLabel = label;
              isHateful = false;
            }
          }
        }
      } else if (result && typeof result === 'object') {
        // Handle single result object
        const label = result.label?.toLowerCase() || '';
        const confidence = result.score || 0;
        
        if (modelConfig.labels.hateful.some(hateLabel => label.includes(hateLabel))) {
          isHateful = true;
          maxConfidence = confidence;
          detectedLabel = label;
        } else {
          isHateful = false;
          maxConfidence = confidence;
          detectedLabel = label;
        }
      }
      
      console.log('AI: Final classification:', { isHateful, detectedLabel, maxConfidence });
      
      // Determine if the content should be classified as hateful
      if (isHateful && maxConfidence >= this.settings.confidence) {
        return {
          label: 'hateful',
          confidence: Math.min(0.95, maxConfidence),
          keywords: this.extractKeywords(processedText),
          explanation: `AI model detected ${detectedLabel} content with ${Math.round(maxConfidence * 100)}% confidence using ${modelConfig.name}`,
          method: 'ai'
        };
      }
      
      return {
        label: 'normal',
        confidence: Math.max(0.5, maxConfidence),
        keywords: [],
        explanation: `AI model classified as ${detectedLabel} content with ${Math.round(maxConfidence * 100)}% confidence using ${modelConfig.name}`,
        method: 'ai'
      };
    } catch (error) {
      console.error('AI classification error:', error);
      return null;
    }
  }

  private extractKeywords(text: string): string[] {
    // AI-based keyword extraction - focus on contextual analysis
    // This method extracts keywords that are most relevant to the AI classification
    
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    
    // Count word frequency and filter out common words
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
    ]);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
        wordCount.set(cleanWord, (wordCount.get(cleanWord) || 0) + 1);
      }
    });
    
    // Return the most frequent words (up to 5)
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
    
    return sortedWords;
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

  private openSidePanel(): void {
    try {
      // Try to open side panel using available APIs
      if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      }
      console.log('Side panel opening requested');
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        enabled: this.settings.enabled,
        confidence: this.settings.confidence,
        selectedModel: this.settings.selectedModel
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  private getCurrentModelConfig(): ModelConfig {
    // Find the current model configuration
    return HATE_SPEECH_MODELS.find(model => model.modelId === this.settings.selectedModel) || DEFAULT_MODEL;
  }

  private async handleClearFeedback(sendResponse: (response: any) => void): Promise<void> {
    try {
      const feedbackManager = FeedbackManager.getInstance();
      await feedbackManager.clearFeedback();
      sendResponse({ success: true });
    } catch (error) {
      console.error('Background: Error clearing feedback:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to clear feedback' });
    }
  }

  private async handleExportFeedback(sendResponse: (response: any) => void): Promise<void> {
    try {
      const feedbackManager = FeedbackManager.getInstance();
      const exportData = await feedbackManager.exportFeedback();
      sendResponse({ success: true, data: exportData });
    } catch (error) {
      console.error('Background: Error exporting feedback:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to export feedback' });
    }
  }

  private async handleGetFeedbackStats(sendResponse: (response: any) => void): Promise<void> {
    try {
      const feedbackManager = FeedbackManager.getInstance();
      const stats = await feedbackManager.getFeedbackStats();
      sendResponse({ success: true, stats });
    } catch (error) {
      console.error('Background: Error getting feedback stats:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to get feedback stats' });
    }
  }

  private async handleFeedbackSubmission(message: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      const feedbackManager = FeedbackManager.getInstance();
      
      // Update metadata with current settings
      const feedbackData = {
        ...message.feedback,
        metadata: {
          ...message.feedback.metadata,
          modelUsed: this.settings.selectedModel,
          confidenceThreshold: this.settings.confidence,
          extensionVersion: '0.1.0'
        }
      };
      
      await feedbackManager.submitFeedback(feedbackData);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Background: Error submitting feedback:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to submit feedback' });
    }
  }
}

// Initialize the background service worker
new BackgroundServiceWorker(); 