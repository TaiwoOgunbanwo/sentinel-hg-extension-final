// Content script for Sentinel HG extension
interface ClassificationResult {
  label: 'hateful' | 'normal';
  confidence: number;
  keywords: string[];
  explanation: string;
  method: 'ai';
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
    console.log('ContentScript constructor called');
    this.init();
  }

  private async init(): Promise<void> {
    console.log('ContentScript init started');
    await this.loadSettings();
    this.setupMessageListeners();
    this.setupMutationObserver();
    this.processExistingContent();
    console.log('Sentinel HG content script initialized');
  }

  private async loadSettings(): Promise<void> {
    try {
      console.log('Loading settings...');
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      console.log('Settings response:', response);
      if (response && response.settings) {
        this.settings = response.settings;
        this.isEnabled = response.settings.enabled;
        console.log('Settings loaded:', this.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  private setupMessageListeners(): void {
    console.log('Setting up message listeners');
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      console.log('Received message:', message);
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
    console.log('Setting up MutationObserver');
    const observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) {
        console.log('Extension disabled, skipping mutations');
        return;
      }

      console.log('Mutation observed:', mutations.length, 'changes');
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

  private processExistingContent(): void {
    console.log('Processing existing content with TreeWalker');
    if (!this.isEnabled) {
      console.log('Extension disabled, skipping existing content');
      return;
    }

    // Use TreeWalker to find all text elements in the document
    const elements = this.findTextElements(document.body);
    console.log('Found', elements.length, 'existing text elements to process');
    
    // Process elements in batches to avoid blocking the UI
    this.processElementsInBatches(elements, 5);
  }

  private processElementsInBatches(elements: Element[], batchSize: number): void {
    let index = 0;
    
    const processBatch = () => {
      const batch = elements.slice(index, index + batchSize);
      console.log(`Processing batch ${Math.floor(index / batchSize) + 1}:`, batch.length, 'elements');
      
      batch.forEach((element) => {
        this.processTextElement(element);
      });
      
      index += batchSize;
      
      if (index < elements.length) {
        // Schedule next batch
        setTimeout(processBatch, 10);
      } else {
        console.log('Finished processing all existing elements');
      }
    };
    
    if (elements.length > 0) {
      processBatch();
    }
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
    console.log('Using TreeWalker to find text elements');
    const elements: Element[] = [];
    
    // Create a TreeWalker to traverse all text nodes
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.trim();
          if (!text || text.length < 10) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check if this text node is part of a valid element
          const parent = node.parentElement;
          if (!parent) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check if the parent element is already processed
          if (parent.dataset.hsExtId || this.processedElements.has(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Check if parent is a valid text element
          if (this.isTextElement(parent)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      const parent = currentNode.parentElement;
      if (parent && this.isTextElement(parent) && !elements.includes(parent)) {
        elements.push(parent);
        console.log('TreeWalker found text element:', parent.tagName, (currentNode.textContent || '').substring(0, 50) + '...');
      }
    }
    
    console.log('TreeWalker found', elements.length, 'text elements');
    return elements;
  }

  private isTextElement(element: Element): boolean {
    const htmlElement = element as HTMLElement;
    const text = element.textContent || htmlElement.innerText || '';
    const trimmedText = text.trim();
    
    // Check if element contains substantial text content
    const hasSubstantialText = trimmedText.length >= 10 && trimmedText.length <= 2000;
    
    // Check if element is a text-containing element type
    const isTextElementType = [
      'P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 
      'LI', 'BLOCKQUOTE', 'ARTICLE', 'SECTION', 'MAIN', 'ASIDE',
      'FIGCAPTION', 'LABEL', 'TD', 'TH'
    ].includes(element.tagName);
    
    // Check if element is not already processed
    const notProcessed = !htmlElement.dataset.hsExtId && !this.processedElements.has(element);
    
    // Check if element is visible (more robust check)
    const isVisible = this.isElementVisible(htmlElement);
    
    // Check if element is not a script, style, or other non-content element
    const isContentElement = ![
      'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'INPUT', 
      'TEXTAREA', 'SELECT', 'BUTTON', 'FORM', 'HEAD', 'TITLE'
    ].includes(element.tagName);
    
    // Check if element is not a child of an already processed element
    const notChildOfProcessed = !this.isChildOfProcessedElement(element);
    
    const isValid = hasSubstantialText && isTextElementType && notProcessed && 
                   isVisible && isContentElement && notChildOfProcessed;
    
    if (isValid) {
      console.log('Valid text element found:', element.tagName, trimmedText.substring(0, 50) + '...');
    }
    
    return isValid;
  }

  private isElementVisible(element: HTMLElement): boolean {
    // Check if element has dimensions
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      return false;
    }
    
    // Check computed style for visibility
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    
    // Check if element is in viewport (basic check)
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    
    return true;
  }

  private isChildOfProcessedElement(element: Element): boolean {
    let parent = element.parentElement;
    while (parent) {
      if (parent.dataset.hsExtId || this.processedElements.has(parent)) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  private processTextElement(element: Element): void {
    const htmlElement = element as HTMLElement;
    const text = element.textContent || htmlElement.innerText || '';
    const trimmedText = text.trim();

    if (trimmedText.length < 10 || htmlElement.dataset.hsExtId) {
      return;
    }

    const uniqueId = `hs-ext-${Date.now()}-${++this.uniqueIdCounter}`;
    htmlElement.dataset.hsExtId = uniqueId;
    this.processedElements.add(element);

    console.log('Processing text element:', uniqueId, trimmedText.substring(0, 50) + '...');
    this.classifyText(trimmedText, uniqueId);
  }

  private classifyText(text: string, elementId: string): void {
    console.log('Sending classification request for:', elementId);
    chrome.runtime.sendMessage({
      action: 'classifyText',
      text: text,
      elementId: elementId
    }, (response: ClassificationResponse) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending classification request:', chrome.runtime.lastError);
        return;
      }
      
      console.log('Received classification response:', response);
      if (response && response.success) {
        this.handleClassificationResult(response);
      } else {
        console.error('Classification failed:', response?.error);
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
    
    // Create a wrapper to preserve layout
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline;
      cursor: pointer;
    `;
    
    // Store original content
    const originalContent = htmlElement.innerHTML;
    const originalText = htmlElement.textContent || '';
    
    // Clear the element and add wrapper
    htmlElement.innerHTML = '';
    htmlElement.appendChild(wrapper);
    
    // Create a blurred text element
    const blurredText = document.createElement('span');
    blurredText.style.cssText = `
      filter: blur(5px);
      transition: filter 0.3s ease;
      user-select: none;
      display: inline;
    `;
    blurredText.textContent = originalText;
    
    // Create a hidden readable text element for hover
    const readableText = document.createElement('span');
    readableText.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      opacity: 0;
      pointer-events: none;
      user-select: none;
      filter: none;
      background: rgba(255, 255, 255, 0.95);
      padding: 2px 4px;
      border-radius: 3px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 1001;
      max-width: 300px;
      word-wrap: break-word;
    `;
    readableText.textContent = originalText;
    
    // Add both elements to wrapper
    wrapper.appendChild(blurredText);
    wrapper.appendChild(readableText);
    
    // Add hover effects
    wrapper.addEventListener('mouseenter', () => {
      blurredText.style.filter = 'blur(0px)';
      readableText.style.opacity = '1';
    });
    
    wrapper.addEventListener('mouseleave', () => {
      blurredText.style.filter = 'blur(5px)';
      readableText.style.opacity = '0';
    });
    
    // Add warning indicator
    const warningIndicator = document.createElement('div');
    warningIndicator.style.cssText = `
      position: absolute; top: -8px; right: -8px; width: 20px; height: 20px;
      background: #ff4444; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; color: white; font-size: 12px; font-weight: bold;
      z-index: 1000; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    warningIndicator.textContent = '!';
    warningIndicator.title = `AI detected hate speech (${Math.round(classification.confidence * 100)}% confidence)`;
    
    // Add click handler for feedback
    warningIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showFeedbackDialog(wrapper, classification, originalText, htmlElement.dataset.hsExtId || '');
    });
    
    wrapper.appendChild(warningIndicator);
    
    // Store reference for cleanup
    (htmlElement as any).hsExtWrapper = wrapper;
    (htmlElement as any).hsExtOriginalContent = originalContent;

    console.log('Applied surgical hateful styling to element:', classification);
  }

  private showFeedbackDialog(_element: HTMLElement, classification: ClassificationResult, originalText: string, _elementId: string): void {
    // Create feedback dialog container
    const dialogContainer = document.createElement('div');
    dialogContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create feedback content
    const feedbackContent = document.createElement('div');
    feedbackContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 20px;
      max-width: 500px;
      width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Add feedback form
    feedbackContent.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #495057;">Help Improve Detection</h3>
        <button id="closeFeedback" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6c757d;">×</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong>Original Text:</strong>
        <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-top: 5px; font-size: 14px; max-height: 100px; overflow-y: auto;">
          ${originalText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <strong>AI Classification:</strong>
        <div style="display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-top: 5px; background: #f8d7da; color: #721c24;">
          🚫 Hateful <span style="font-size: 12px; opacity: 0.8;">(${Math.round(classification.confidence * 100)}% confidence)</span>
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; font-weight: 500; color: #495057;">Is this AI classification correct?</p>
      </div>
      
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button id="feedbackCorrect" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; background: white; cursor: pointer; font-size: 14px;">✅ Correct</button>
        <button id="feedbackFalsePositive" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; background: white; cursor: pointer; font-size: 14px;">❌ False Positive</button>
        <button id="feedbackFalseNegative" style="flex: 1; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; background: white; cursor: pointer; font-size: 14px;">⚠️ False Negative</button>
      </div>
      
      <div id="feedbackDetails" style="display: none; margin-bottom: 20px;">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;">Reason:</label>
          <select id="feedbackReason" style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;">
            <option value="">Select a reason...</option>
          </select>
        </div>
        
        <div id="customReasonDiv" style="display: none; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;">Custom Reason:</label>
          <input type="text" id="customReason" style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;" placeholder="Please specify...">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #495057;">Category (optional):</label>
          <select id="feedbackCategory" style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 14px;">
            <option value="">Select a category...</option>
            <option value="racism">Racism</option>
            <option value="sexism">Sexism</option>
            <option value="homophobia">Homophobia</option>
            <option value="transphobia">Transphobia</option>
            <option value="religious">Religious Discrimination</option>
            <option value="disability">Disability Discrimination</option>
            <option value="ageism">Ageism</option>
            <option value="classism">Classism</option>
            <option value="xenophobia">Xenophobia</option>
            <option value="general">General Hate Speech</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button id="submitFeedback" style="flex: 1; padding: 12px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; background: #6c757d; color: white;" disabled>Submit Feedback</button>
        <button id="cancelFeedback" style="flex: 1; padding: 12px; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; background: #6c757d; color: white;">Cancel</button>
      </div>
    `;
    
    dialogContainer.appendChild(feedbackContent);
    document.body.appendChild(dialogContainer);
    
    // Add event listeners
    let selectedFeedbackType: 'correct' | 'false_positive' | 'false_negative' | null = null;
    
    const closeDialog = () => {
      document.body.removeChild(dialogContainer);
    };
    
    const updateSubmitButton = () => {
      const submitBtn = document.getElementById('submitFeedback') as HTMLButtonElement;
      if (submitBtn) {
        submitBtn.disabled = !selectedFeedbackType;
        submitBtn.style.background = selectedFeedbackType ? '#667eea' : '#6c757d';
      }
    };
    
    const showFeedbackDetails = (feedbackType: 'false_positive' | 'false_negative') => {
      const detailsDiv = document.getElementById('feedbackDetails') as HTMLElement;
      const reasonSelect = document.getElementById('feedbackReason') as HTMLSelectElement;
      
      if (detailsDiv && reasonSelect) {
        detailsDiv.style.display = 'block';
        reasonSelect.innerHTML = '<option value="">Select a reason...</option>';
        
        const reasons = feedbackType === 'false_positive' ? [
          { value: 'sarcasm', label: 'Sarcasm or Irony' },
          { value: 'context', label: 'Missing Context' },
          { value: 'joke', label: 'Joke or Humor' },
          { value: 'criticism', label: 'Constructive Criticism' },
          { value: 'discussion', label: 'Academic Discussion' },
          { value: 'quote', label: 'Quoted Content' },
          { value: 'other_fp', label: 'Other (False Positive)' }
        ] : [
          { value: 'subtle_hate', label: 'Subtle Hate Speech' },
          { value: 'coded_language', label: 'Coded Language' },
          { value: 'implicit_bias', label: 'Implicit Bias' },
          { value: 'microaggression', label: 'Microaggression' },
          { value: 'dog_whistle', label: 'Dog Whistle' },
          { value: 'other_fn', label: 'Other (False Negative)' }
        ];
        
        reasons.forEach(reason => {
          const option = document.createElement('option');
          option.value = reason.value;
          option.textContent = reason.label;
          reasonSelect.appendChild(option);
        });
      }
    };
    
    // Event listeners
    document.getElementById('closeFeedback')?.addEventListener('click', closeDialog);
    document.getElementById('cancelFeedback')?.addEventListener('click', closeDialog);
    
    document.getElementById('feedbackCorrect')?.addEventListener('click', () => {
      selectedFeedbackType = 'correct';
      document.getElementById('feedbackDetails')!.style.display = 'none';
      updateSubmitButton();
    });
    
    document.getElementById('feedbackFalsePositive')?.addEventListener('click', () => {
      selectedFeedbackType = 'false_positive';
      showFeedbackDetails('false_positive');
      updateSubmitButton();
    });
    
    document.getElementById('feedbackFalseNegative')?.addEventListener('click', () => {
      selectedFeedbackType = 'false_negative';
      showFeedbackDetails('false_negative');
      updateSubmitButton();
    });
    
    // Handle reason selection
    document.getElementById('feedbackReason')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const customReasonDiv = document.getElementById('customReasonDiv') as HTMLElement;
      if (customReasonDiv) {
        customReasonDiv.style.display = (target.value === 'other_fp' || target.value === 'other_fn') ? 'block' : 'none';
      }
    });
    
    // Handle submit
    document.getElementById('submitFeedback')?.addEventListener('click', async () => {
      if (!selectedFeedbackType) return;
      
      const reasonSelect = document.getElementById('feedbackReason') as HTMLSelectElement;
      const customReasonInput = document.getElementById('customReason') as HTMLInputElement;
      const categorySelect = document.getElementById('feedbackCategory') as HTMLSelectElement;
      
      const feedbackData = {
        originalText,
        classification,
        userFeedback: {
          type: selectedFeedbackType,
          reason: reasonSelect?.value || customReasonInput?.value || '',
          category: categorySelect?.value || undefined
        },
        context: {
          url: window.location.href,
          elementType: 'text',
          pageTitle: document.title
        },
        metadata: {
          modelUsed: classification.method,
          confidenceThreshold: 0.7,
          extensionVersion: '0.1.0'
        }
      };
      
      try {
        // Send feedback to background script
        await chrome.runtime.sendMessage({
          action: 'submitFeedback',
          feedback: feedbackData
        });
        
        // Show success message
        feedbackContent.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
            <div style="font-size: 16px; color: #28a745; font-weight: 500;">Thank you for your feedback!</div>
          </div>
        `;
        
        // Close after 2 seconds
        setTimeout(closeDialog, 2000);
      } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Error submitting feedback. Please try again.');
      }
    });
    
    // Close on background click
    dialogContainer.addEventListener('click', (e) => {
      if (e.target === dialogContainer) {
        closeDialog();
      }
    });
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