// Popup functionality for Sentinel HG extension
class PopupManager {
    constructor() {
        this.isEnabled = true; // Default state
        this.init();
    }

    async init() {
        await this.loadExtensionState();
        this.setupEventListeners();
        this.updateUI();
        console.log('Popup initialized, extension state:', this.isEnabled);
    }

    async loadExtensionState() {
        try {
            // Read the extension state from local storage
            const result = await chrome.storage.local.get(['extensionEnabled']);
            
            // If no saved state exists, default to enabled (true)
            if (result.extensionEnabled !== undefined) {
                this.isEnabled = result.extensionEnabled;
                console.log('Loaded extension state from storage:', this.isEnabled);
            } else {
                // First time setup - save default enabled state
                this.isEnabled = true;
                await this.saveExtensionState();
                console.log('First time setup - saved default enabled state');
            }
        } catch (error) {
            console.error('Error loading extension state:', error);
            // Fallback to enabled state if there's an error
            this.isEnabled = true;
        }
    }

    async saveExtensionState() {
        try {
            // Save the extension state to local storage
            await chrome.storage.local.set({ extensionEnabled: this.isEnabled });
            console.log('Saved extension state to storage:', this.isEnabled);
        } catch (error) {
            console.error('Error saving extension state:', error);
        }
    }

    setupEventListeners() {
        // Toggle switch event listener
        const toggleInput = document.getElementById('extensionToggle');
        if (toggleInput) {
            toggleInput.addEventListener('change', (e) => {
                this.handleToggleChange(e.target.checked);
            });
        } else {
            console.error('Toggle input element not found');
        }
    }

    async handleToggleChange(enabled) {
        console.log('Toggle changed to:', enabled);
        
        // Update local state
        this.isEnabled = enabled;
        
        // Save to storage
        await this.saveExtensionState();
        
        // Update UI
        this.updateUI();
        
        // Notify background script
        this.notifyBackgroundScript();
    }

    notifyBackgroundScript() {
        try {
            chrome.runtime.sendMessage({
                action: 'toggleExtension',
                enabled: this.isEnabled
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to background script:', chrome.runtime.lastError);
                } else {
                    console.log('Background script notified of state change:', this.isEnabled);
                }
            });
        } catch (error) {
            console.error('Error notifying background script:', error);
        }
    }

    updateUI() {
        // Update toggle switch to reflect current state
        const toggleInput = document.getElementById('extensionToggle');
        if (toggleInput) {
            toggleInput.checked = this.isEnabled;
            console.log('Updated UI - toggle switch set to:', this.isEnabled);
        } else {
            console.error('Toggle input element not found during UI update');
        }
    }

    // Method to refresh state from storage (useful when popup is reopened)
    async refreshState() {
        await this.loadExtensionState();
        this.updateUI();
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popupManager = new PopupManager();
    
    // Handle popup window focus to refresh state
    window.addEventListener('focus', async () => {
        console.log('Popup focused - refreshing state');
        await popupManager.refreshState();
    });
});

// Handle popup window visibility change
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log('Popup became visible - refreshing state');
        // Small delay to ensure DOM is ready
        setTimeout(async () => {
            const popupManager = window.popupManager;
            if (popupManager) {
                await popupManager.refreshState();
            }
        }, 100);
    }
}); 