// Content script for Sentinel HG extension
class ContentScriptManager {
    constructor() {
        this.processedElements = new Set();
        this.uniqueIdCounter = 0;
        this.isEnabled = true;
        this.settings = {
            sensitivity: 70,
            autoFilter: true,
            showExplanations: true
        };
        
        this.init();
    }

    init() {
        this.setupMessageListeners();
        this.setupMutationObserver();
        this.loadSettings();
        console.log('Sentinel HG content script initialized');
    }

    async loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
            if (response && response.settings) {
                this.settings = response.settings;
                this.isEnabled = response.enabled;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

    setupMutationObserver() {
        // Create a MutationObserver to watch for new elements
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

        // Start observing the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('MutationObserver started');
    }

    processNewNode(node) {
        // Only process element nodes
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        // Find text-containing elements within the node
        const textElements = this.findTextElements(node);

        textElements.forEach((element) => {
            this.processTextElement(element);
        });
    }

    findTextElements(node) {
        // Selectors for common text-containing elements
        const textSelectors = [
            'p', 'span', 'div', 'article', 'section',
            '[data-testid*="tweet"]', // Twitter/X specific
            '[data-testid*="post"]',  // Reddit specific
            '.post-content',          // Generic post content
            '.comment-content',       // Generic comment content
            '.message-content'        // Generic message content
        ];

        const elements = [];
        
        // Check if the node itself matches our selectors
        if (this.isTextElement(node)) {
            elements.push(node);
        }

        // Find all matching elements within the node
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

    isTextElement(element) {
        // Check if element contains meaningful text content
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();
        
        // Must have sufficient text and not be already processed
        return trimmedText.length >= 10 && 
               !element.dataset.hsExtId &&
               !this.processedElements.has(element);
    }

    processTextElement(element) {
        const text = element.textContent || element.innerText || '';
        const trimmedText = text.trim();

        // Skip if text is too short or already processed
        if (trimmedText.length < 10 || element.dataset.hsExtId) {
            return;
        }

        // Generate unique ID
        const uniqueId = `hs-ext-${Date.now()}-${++this.uniqueIdCounter}`;
        element.dataset.hsExtId = uniqueId;
        this.processedElements.add(element);

        // Send text for classification
        this.classifyText(trimmedText, uniqueId);
    }

    classifyText(text, elementId) {
        chrome.runtime.sendMessage({
            action: 'classifyText',
            text: text,
            elementId: elementId
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error sending classification request:', chrome.runtime.lastError);
                return;
            }
            
            if (response && response.success) {
                this.handleClassificationResult(response);
            }
        });
    }

    handleClassificationResult(response) {
        const { classification, elementId } = response;
        
        if (!classification || !elementId) {
            console.error('Invalid classification result:', response);
            return;
        }

        // Find the element by its unique ID
        const element = document.querySelector(`[data-hs-ext-id="${elementId}"]`);
        
        if (!element) {
            console.warn('Element not found for ID:', elementId);
            return;
        }

        console.log('Classification result:', classification.label, 'for element:', elementId);

        // Apply styling based on classification result
        if (classification.label === 'hateful') {
            this.applyHatefulStyling(element, classification);
        }
    }

    applyHatefulStyling(element, classification) {
        // Apply blur effect
        element.style.filter = 'blur(5px)';
        element.style.transition = 'filter 0.3s ease';
        element.style.cursor = 'pointer';
        
        // Add hover effect to temporarily un-blur
        const originalFilter = element.style.filter;
        
        element.addEventListener('mouseenter', () => {
            element.style.filter = 'none';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.filter = originalFilter;
        });

        // Add visual indicator
        element.style.position = 'relative';
        
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
        warningIndicator.title = `Hate speech detected (${Math.round(classification.confidence * 100)}% confidence)`;
        
        // Add click handler to show explanation
        warningIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showExplanation(element, classification);
        });
        
        element.appendChild(warningIndicator);

        // Add explanation tooltip on hover
        if (this.settings.showExplanations) {
            element.title = `Hate speech detected: ${classification.explanation}`;
        }

        console.log('Applied hateful styling to element:', elementId);
    }

    showExplanation(element, classification) {
        // Create a simple explanation popup
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
        new ContentScriptManager();
    });
} else {
    new ContentScriptManager();
}