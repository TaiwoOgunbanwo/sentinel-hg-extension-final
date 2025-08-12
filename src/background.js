// Background script for Sentinel HG extension
class BackgroundManager {
    constructor() {
        this.isEnabled = true;
        this.settings = {
            sensitivity: 70,
            autoFilter: true,
            showExplanations: true
        };
        this.stats = {
            detected: 0,
            filtered: 0
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        this.setupMessageListeners();
        console.log('Sentinel HG background script initialized');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['settings', 'enabled']);
            if (result.settings) {
                this.settings = { ...this.settings, ...result.settings };
            }
            if (result.enabled !== undefined) {
                this.isEnabled = result.enabled;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['stats']);
            if (result.stats) {
                this.stats = result.stats;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({ stats: this.stats });
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'toggleExtension':
                    this.toggleExtension(message.enabled);
                    break;
                case 'updateSettings':
                    this.updateSettings(message.settings);
                    break;
                case 'clearStats':
                    this.clearStats();
                    break;
                case 'getSettings':
                    sendResponse({ settings: this.settings, enabled: this.isEnabled });
                    break;
                case 'getStats':
                    sendResponse({ stats: this.stats });
                    break;
                case 'incrementDetected':
                    this.incrementDetected();
                    break;
                case 'incrementFiltered':
                    this.incrementFiltered();
                    break;
                case 'classifyText':
                    this.handleTextClassification(message, sender, sendResponse);
                    return true; // Keep the message channel open for async response
                default:
                    console.log('Unknown message action:', message.action);
            }
        });
    }

    toggleExtension(enabled) {
        this.isEnabled = enabled;
        console.log(`Extension ${enabled ? 'enabled' : 'disabled'}`);
        
        // Notify all content scripts
        this.notifyContentScripts({
            action: 'extensionToggled',
            enabled: this.isEnabled
        });
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('Settings updated:', this.settings);
        
        // Notify all content scripts
        this.notifyContentScripts({
            action: 'settingsUpdated',
            settings: this.settings
        });
    }

    clearStats() {
        this.stats = { detected: 0, filtered: 0 };
        this.saveStats();
        console.log('Stats cleared');
    }

    incrementDetected() {
        this.stats.detected++;
        this.saveStats();
        console.log('Detected count incremented:', this.stats.detected);
    }

    incrementFiltered() {
        this.stats.filtered++;
        this.saveStats();
        console.log('Filtered count incremented:', this.stats.filtered);
    }

    // Mock classification function for hate speech detection
    classifyText(text) {
        // Simple keyword-based classification
        const hateKeywords = [
            'idiot', 'stupid', 'hate', 'awful', 'terrible', 'horrible',
            'disgusting', 'vile', 'scum', 'trash', 'worthless', 'useless',
            'dumb', 'moron', 'retard', 'fool', 'imbecile', 'cretin'
        ];

        // Convert text to lowercase for case-insensitive matching
        const lowerText = text.toLowerCase();
        
        // Check if any hate keywords are present in the text
        const foundKeywords = hateKeywords.filter(keyword => 
            lowerText.includes(keyword)
        );

        if (foundKeywords.length > 0) {
            console.log('Hate speech detected. Keywords found:', foundKeywords);
            return {
                label: 'hateful',
                confidence: Math.min(0.9, 0.5 + (foundKeywords.length * 0.1)),
                keywords: foundKeywords,
                explanation: `Detected hate speech keywords: ${foundKeywords.join(', ')}`
            };
        } else {
            return {
                label: 'normal',
                confidence: 0.8,
                keywords: [],
                explanation: 'No hate speech keywords detected'
            };
        }
    }

    // Handle text classification requests from content scripts
    async handleTextClassification(message, sender, sendResponse) {
        try {
            const { text, elementId } = message;
            
            if (!text || typeof text !== 'string') {
                sendResponse({
                    success: false,
                    error: 'Invalid text provided',
                    elementId: elementId
                });
                return;
            }

            console.log('Classifying text:', text.substring(0, 100) + '...');
            
            // Perform classification
            const classification = this.classifyText(text);
            
            // Update statistics if hateful content is detected
            if (classification.label === 'hateful') {
                this.incrementDetected();
            }

            // Send response back to content script
            sendResponse({
                success: true,
                classification: classification,
                elementId: elementId,
                originalText: text
            });

            console.log('Classification result:', classification.label, 'for element:', elementId);
            
        } catch (error) {
            console.error('Error in text classification:', error);
            sendResponse({
                success: false,
                error: error.message,
                elementId: message.elementId
            });
        }
    }

    notifyContentScripts(message) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && this.isSupportedSite(tab.url)) {
                    chrome.tabs.sendMessage(tab.id, message).catch(() => {
                        // Ignore errors for tabs that don't have content scripts
                    });
                }
            });
        });
    }

    isSupportedSite(url) {
        const supportedDomains = [
            'twitter.com',
            'x.com',
            'facebook.com',
            'reddit.com'
        ];
        
        try {
            const urlObj = new URL(url);
            return supportedDomains.some(domain => 
                urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
            );
        } catch (error) {
            return false;
        }
    }

    // Method to get current state for popup
    getCurrentState() {
        return {
            enabled: this.isEnabled,
            settings: this.settings,
            stats: this.stats
        };
    }
}

// Initialize background manager
const backgroundManager = new BackgroundManager();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Sentinel HG extension installed:', details.reason);
    
    if (details.reason === 'install') {
        // Set default settings on first install
        chrome.storage.sync.set({
            settings: {
                sensitivity: 70,
                autoFilter: true,
                showExplanations: true
            },
            enabled: true
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Sentinel HG extension started');
});

// Handle tab updates to inject content scripts if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && backgroundManager.isSupportedSite(tab.url)) {
        // Content script should be automatically injected via manifest
        console.log('Tab updated on supported site:', tab.url);
    }
});
