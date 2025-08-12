# Debugging Guide for Sentinel HG Extension

## Common Issues and Solutions

### 1. Extension Not Working at All

**Symptoms:**
- No blurring of content
- No statistics in side panel
- No console messages

**Debugging Steps:**

1. **Check Extension Loading:**
   - Go to `chrome://extensions/`
   - Ensure the extension is loaded and enabled
   - Check for any error messages in the extension card

2. **Check Console for Errors:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages related to the extension
   - Check both the main page console and the extension's background page console

3. **Test with Test Page:**
   - Open `dist/test.html` in your browser
   - This page contains test content that should trigger the extension
   - Check if content is being processed

### 2. Side Panel Not Opening

**Symptoms:**
- Clicking "Open Side Panel" button does nothing
- No side panel appears

**Solutions:**

1. **Manual Side Panel Opening:**
   - Right-click on the extension icon in the toolbar
   - Select "Open side panel" from the context menu

2. **Check Chrome Version:**
   - Side panel API requires Chrome 114+
   - Update Chrome if needed

3. **Alternative Method:**
   - Open Developer Tools
   - Go to Application tab
   - Look for "Side panel" in the left sidebar
   - Click to open manually

### 3. Content Not Being Blurred

**Symptoms:**
- Text content is not being detected
- No blur effects applied

**Debugging Steps:**

1. **Check Content Script:**
   - Open Developer Tools
   - Go to Console tab
   - Look for messages like "Found text element:" or "Processing text element:"
   - If no messages, the content script isn't running

2. **Check Background Script:**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "Service Worker" link
   - Check the console for background script messages

3. **Test with Simple Content:**
   - Create a simple HTML page with paragraphs containing hate speech keywords
   - Load the extension and test

### 4. AI Model Not Loading

**Symptoms:**
- Console shows "Falling back to keyword-based detection"
- No AI classification happening

**Solutions:**

1. **Check Network:**
   - AI models are downloaded from Hugging Face
   - Ensure internet connection is working
   - Check if any firewall is blocking the download

2. **Check Console:**
   - Look for "Loading AI model..." messages
   - Check for any network errors

3. **Fallback Works:**
   - The extension should still work with keyword detection
   - Check if keyword-based detection is working

### 5. Statistics Not Updating

**Symptoms:**
- Side panel shows 0 detections
- No recent detections list

**Debugging Steps:**

1. **Check Storage:**
   - Open Developer Tools
   - Go to Application tab
   - Look for "Storage" > "Chrome Storage" > "Local Storage"
   - Check if data is being saved

2. **Check Background Script:**
   - Ensure the background script is receiving classification requests
   - Check if `storeDetection` method is being called

### 6. Extension Permissions

**Check Required Permissions:**
- `storage` - for saving settings and statistics
- `activeTab` - for accessing current tab
- `sidePanel` - for side panel functionality
- `host_permissions` - for accessing web pages

### 7. Testing Checklist

1. **Load Extension:**
   - [ ] Extension loads without errors in `chrome://extensions/`
   - [ ] No red error messages in extension card

2. **Enable Extension:**
   - [ ] Click extension icon to open popup
   - [ ] Toggle extension to "Enabled"
   - [ ] Set confidence to 70%

3. **Test Content Detection:**
   - [ ] Open `dist/test.html`
   - [ ] Check console for "Found text element" messages
   - [ ] Check if hateful content is blurred

4. **Test Side Panel:**
   - [ ] Right-click extension icon
   - [ ] Select "Open side panel"
   - [ ] Check if statistics are displayed

5. **Test AI Model:**
   - [ ] Check console for "AI model loaded successfully"
   - [ ] Look for "method: 'ai'" in classification results

### 8. Console Messages to Look For

**Successful Operation:**
```
Sentinel HG background service worker initialized
Loading AI model...
AI model loaded successfully
Found text element: [text content]
Processing text element: [id] [text content]
Sending classification request for: [id]
Classifying text: [text] for element: [id]
Classification result: {label: 'hateful', confidence: 0.8, method: 'ai'}
```

**Error Messages:**
```
Error loading AI model: [error]
Falling back to keyword-based detection
Error sending classification request: [error]
Classification failed: [error]
```

### 9. Manual Testing

1. **Create Test Content:**
   ```html
   <p>This is some terrible content with hate speech. I really hate this and think it's awful.</p>
   ```

2. **Check Extension State:**
   - Open popup and ensure extension is enabled
   - Check confidence setting

3. **Monitor Console:**
   - Watch for processing messages
   - Check for any error messages

4. **Verify Results:**
   - Content should be blurred if detected as hateful
   - Side panel should show statistics
   - Console should show classification details

### 10. Getting Help

If the extension still doesn't work:

1. **Collect Debug Information:**
   - Screenshots of console errors
   - Extension status from `chrome://extensions/`
   - Chrome version information

2. **Check Known Issues:**
   - Chrome version compatibility
   - Network connectivity for AI models
   - Extension permissions

3. **Report Issues:**
   - Include debug information
   - Describe exact steps to reproduce
   - Mention Chrome version and OS 