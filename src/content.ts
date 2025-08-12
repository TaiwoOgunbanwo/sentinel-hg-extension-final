// Content script for Sentinel HG extension
interface ClassificationResult {
  label: 'hateful' | 'normal';
  confidence: number;
  keywords: string[];
  explanation: string;
  method: 'ai' | 'keyword';
}

interface ClassificationResponse {
  success: boolean;
  classification?: ClassificationResult;
  elementId: string;
  error?: string;
  originalText?: string;
}

class ContentScript {
  private processedElements = new Set<Element>();
  private uniqueIdCounter = 0;
  private isEnabled = true;
  private settings = {
    confidence: 0.7
  };

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.setupMessageListeners();
    this.setupMutationObserver();
    console.log('Sentinel HG content script initialized');
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response && response.settings) {
        this.settings = response.settings;
        this.isEnabled = response.settings.enabled;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      switch (message.action) {
        case 'extensionToggled':
          this.isEnabled = message.enabled;
          console.log(`Extension ${this.isEnabled ? 'enabled' : 'disabled'}`);
          break;
        case 'settingsUpdated':
          this.settings = message.settings;
          console.log('Settings updated:', this.settings);
          break;
        default:
          // Handle classification results
          if (message.success !== undefined) {
            this.handleClassificationResult(message);
          }
      }
    });
  }

  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            this.processNewNode(node);
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('MutationObserver started');
  }

  private processNewNode(node: Node): void {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const textElements = this.findTextElements(node as Element);
    textElements.forEach((element) => {
      this.processTextElement(element);
    });
  }

  private findTextElements(node: Element): Element[] {
    const textSelectors = [
      'p', 'span', 'div', 'article', 'section',
      '[data-testid*="tweet"]', // Twitter/X specific
      '[data-testid*="post"]',  // Reddit specific
      '.post-content',          // Generic post content
      '.comment-content',       // Generic comment content
      '.message-content'        // Generic message content
    ];

    const elements: Element[] = [];
    
    if (this.isTextElement(node)) {
      elements.push(node);
    }

    textSelectors.forEach(selector => {
      try {
        const found = node.querySelectorAll(selector);
        found.forEach(element => {
          if (this.isTextElement(element)) {
            elements.push(element);
          }
        });
      } catch (error) {
        // Ignore invalid selectors
      }
    });

    return elements;
  }

  private isTextElement(element: Element): boolean {
    const text = element.textContent || element.textContent || '';
    const trimmedText = text.trim();
    
    return trimmedText.length >= 10 && 
           !(element as HTMLElement).dataset.hsExtId &&
           !this.processedElements.has(element);
  }

  private processTextElement(element: Element): void {
    const text = element.textContent || element.textContent || '';
    const trimmedText = text.trim();
    const htmlElement = element as HTMLElement;

    if (trimmedText.length < 10 || htmlElement.dataset.hsExtId) {
      return;
    }

    const uniqueId = `hs-ext-${Date.now()}-${++this.uniqueIdCounter}`;
    htmlElement.dataset.hsExtId = uniqueId;
    this.processedElements.add(element);

    this.classifyText(trimmedText, uniqueId);
  }

  private classifyText(text: string, elementId: string): void {
    chrome.runtime.sendMessage({
      action: 'classifyText',
      text: text,
      elementId: elementId
    }, (response: ClassificationResponse) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending classification request:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        this.handleClassificationResult(response);
      }
    });
  }

  private handleClassificationResult(response: ClassificationResponse): void {
    const { classification, elementId } = response;
    
    if (!classification || !elementId) {
      console.error('Invalid classification result:', response);
      return;
    }

    const element = document.querySelector(`[data-hs-ext-id="${elementId}"]`);
    
    if (!element) {
      console.warn('Element not found for ID:', elementId);
      return;
    }

    console.log('Classification result:', classification.label, 'for element:', elementId);

    if (classification.label === 'hateful') {
      this.applyHatefulStyling(element, classification);
    }
  }

  private applyHatefulStyling(element: Element, classification: ClassificationResult): void {
    const htmlElement = element as HTMLElement;
    
    // Apply blur effect
    htmlElement.style.filter = 'blur(5px)';
    htmlElement.style.transition = 'filter 0.3s ease';
    htmlElement.style.cursor = 'pointer';
    
    // Add hover effect to temporarily un-blur
    const originalFilter = htmlElement.style.filter;
    
    htmlElement.addEventListener('mouseenter', () => {
      htmlElement.style.filter = 'none';
    });
    
    htmlElement.addEventListener('mouseleave', () => {
      htmlElement.style.filter = originalFilter;
    });

    // Add visual indicator
    htmlElement.style.position = 'relative';
    
    // Create warning indicator
    const warningIndicator = document.createElement('div');
    warningIndicator.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      width: 20px;
      height: 20px;
      background: #ff4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      cursor: pointer;
    `;
    warningIndicator.textContent = '!';
            warningIndicator.title = `Hate speech detected (${Math.round(classification.confidence * 100)}% confidence) - ${classification.method.toUpperCase()}`;
    
    // Add click handler to show explanation
    warningIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showExplanation(htmlElement, classification);
    });
    
    htmlElement.appendChild(warningIndicator);

    console.log('Applied hateful styling to element:', classification);
  }

  private showExplanation(element: HTMLElement, classification: ClassificationResult): void {
    const popup = document.createElement('div');
    popup.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      background: #333;
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      max-width: 300px;
      z-index: 1001;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    
            popup.innerHTML = `
            <strong>Hate Speech Detected</strong><br>
            Method: ${classification.method.toUpperCase()}<br>
            Confidence: ${Math.round(classification.confidence * 100)}%<br>
            Keywords: ${classification.keywords.join(', ')}<br>
            <small>${classification.explanation}</small>
        `;
    
    element.appendChild(popup);
    
    // Remove popup after 5 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 5000);
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScript();
  });
} else {
  new ContentScript();
} 