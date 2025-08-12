# Feedback System Guide

This document explains the feedback system implemented in the Sentinel HG extension, which allows users to report false positives and false negatives to help improve the hate speech detection accuracy.

## Overview

The feedback system provides a comprehensive way for users to contribute to the improvement of hate speech detection by reporting incorrect classifications. This data can be used to:

- Identify patterns in false positives/negatives
- Improve model accuracy over time
- Understand edge cases and limitations
- Guide future model development

## Features

### 1. **User-Friendly Feedback Interface**
- **Modal Dialog**: Clean, accessible feedback form that appears when users click the warning indicator
- **Simple Options**: Three clear choices: Correct, False Positive, False Negative
- **Detailed Reasons**: Predefined reasons for false positives and false negatives
- **Custom Input**: Option to provide custom reasons for edge cases
- **Category Selection**: Optional categorization of hate speech types

### 2. **Comprehensive Data Collection**
- **Original Text**: Preserves the exact text that was classified
- **Classification Details**: Method used (AI/Keyword), confidence score, keywords
- **User Feedback**: Type of feedback, reason, and optional category
- **Context Information**: URL, page title, element type
- **Metadata**: Model used, confidence threshold, extension version

### 3. **Feedback Statistics**
- **Real-time Stats**: Track accuracy, false positives, false negatives
- **Visual Dashboard**: Side panel shows feedback statistics
- **Export Functionality**: Download feedback data for analysis
- **Data Management**: Clear feedback data when needed

## How It Works

### 1. **Triggering Feedback**
When hate speech is detected and blurred, users can:
1. Click the red warning indicator (⚠️) on the blurred text
2. A feedback dialog appears with the original text and classification details
3. Users can provide feedback on the accuracy of the classification

### 2. **Feedback Options**

#### **Correct Classification** ✅
- User confirms the classification was accurate
- No additional details required
- Contributes to accuracy statistics

#### **False Positive** ❌
- User indicates content was incorrectly flagged as hateful
- Required to select a reason:
  - Sarcasm or Irony
  - Missing Context
  - Joke or Humor
  - Constructive Criticism
  - Academic Discussion
  - Quoted Content
  - Other (with custom input)

#### **False Negative** ⚠️
- User indicates hate speech was missed
- Required to select a reason:
  - Subtle Hate Speech
  - Coded Language
  - Implicit Bias
  - Microaggression
  - Dog Whistle
  - Other (with custom input)

### 3. **Optional Categorization**
Users can optionally categorize the content:
- Racism
- Sexism
- Homophobia
- Transphobia
- Religious Discrimination
- Disability Discrimination
- Ageism
- Classism
- Xenophobia
- General Hate Speech
- Other

## Data Storage

### **Local Storage**
- All feedback is stored locally in Chrome's storage
- No data is sent to external servers
- Privacy-preserving approach
- Data persists across browser sessions

### **Storage Structure**
```typescript
interface FeedbackData {
  id: string;
  timestamp: number;
  originalText: string;
  classification: {
    label: 'hateful' | 'normal';
    confidence: number;
    method: 'ai' | 'keyword';
    keywords: string[];
    explanation: string;
  };
  userFeedback: {
    type: 'false_positive' | 'false_negative' | 'correct';
    reason?: string;
    category?: string;
  };
  context: {
    url: string;
    elementType: string;
    pageTitle: string;
  };
  metadata: {
    modelUsed: string;
    confidenceThreshold: number;
    extensionVersion: string;
  };
}
```

## Statistics and Analytics

### **Feedback Statistics**
- **Total Feedback**: Number of feedback submissions
- **Accuracy**: Percentage of correct classifications
- **False Positives**: Number of incorrect hate speech flags
- **False Negatives**: Number of missed hate speech cases
- **Correct Classifications**: Number of accurate detections

### **Real-time Updates**
- Statistics update immediately when feedback is submitted
- Side panel refreshes automatically
- No page reload required

## Export and Analysis

### **Data Export**
- Export all feedback data as JSON
- Includes statistics and individual feedback entries
- Timestamped exports for version control
- Compatible with data analysis tools

### **Export Format**
```json
{
  "exportDate": "2024-01-15T10:30:00.000Z",
  "stats": {
    "totalFeedback": 150,
    "falsePositives": 25,
    "falseNegatives": 15,
    "correctClassifications": 110,
    "accuracy": 0.733
  },
  "feedback": [
    {
      "id": "feedback-1705312200000-abc123",
      "timestamp": 1705312200000,
      "originalText": "Example text...",
      "classification": { ... },
      "userFeedback": { ... },
      "context": { ... },
      "metadata": { ... }
    }
  ]
}
```

## Privacy and Security

### **Privacy Features**
- **Local Storage**: All data stays on user's device
- **No External Transmission**: No data sent to servers
- **User Control**: Users can clear data at any time
- **Optional Participation**: Feedback is completely voluntary

### **Data Protection**
- **Anonymized**: No personal information collected
- **Contextual**: Only page context, not user identity
- **Secure**: Uses Chrome's secure storage APIs
- **Transparent**: Clear about what data is collected

## Usage Instructions

### **For Users**

1. **Submit Feedback**:
   - Click the warning indicator on blurred text
   - Choose feedback type (Correct/False Positive/False Negative)
   - Select reason and optional category
   - Click "Submit Feedback"

2. **View Statistics**:
   - Open the extension side panel
   - View feedback statistics in the "Feedback Statistics" section
   - Monitor accuracy improvements over time

3. **Export Data**:
   - Click "Export Feedback" in the side panel
   - Download JSON file with all feedback data
   - Use for personal analysis or share with developers

4. **Clear Data**:
   - Click "Clear Feedback" in the side panel
   - Confirm deletion of all feedback data
   - Start fresh with new feedback collection

### **For Developers**

1. **Access Feedback Data**:
   ```typescript
   const feedbackManager = FeedbackManager.getInstance();
   const stats = await feedbackManager.getFeedbackStats();
   const allFeedback = await feedbackManager.getAllFeedback();
   ```

2. **Analyze Patterns**:
   - Review false positive reasons for common patterns
   - Identify frequently missed hate speech types
   - Use data to improve model training

3. **Model Improvement**:
   - Use feedback to fine-tune detection algorithms
   - Adjust confidence thresholds based on user feedback
   - Develop new detection methods for edge cases

## Future Enhancements

### **Planned Features**
1. **Feedback Analytics**: Advanced analytics and visualization
2. **Model Retraining**: Use feedback to improve models
3. **Community Features**: Share insights with other users
4. **Automated Improvements**: Automatic model updates based on feedback

### **Advanced Analytics**
1. **Pattern Recognition**: Identify common false positive/negative patterns
2. **Performance Metrics**: Track model performance over time
3. **User Insights**: Understand user behavior and preferences
4. **Quality Assurance**: Validate feedback quality and consistency

## Troubleshooting

### **Common Issues**

1. **Feedback Not Saving**:
   - Check Chrome storage permissions
   - Verify extension is enabled
   - Check console for error messages

2. **Statistics Not Updating**:
   - Refresh the side panel
   - Check message listener setup
   - Verify background script is running

3. **Export Not Working**:
   - Check file download permissions
   - Verify sufficient storage space
   - Try different browser or incognito mode

### **Debug Information**
- Check browser console for error messages
- Verify feedback data in Chrome storage
- Monitor network requests for any issues
- Test with different content types

## Best Practices

### **For Users**
- Provide detailed reasons for false positives/negatives
- Use custom reasons for unique cases
- Categorize content when possible
- Submit feedback regularly for better accuracy

### **For Developers**
- Respect user privacy and data preferences
- Use feedback data responsibly
- Implement feedback loops for model improvement
- Maintain transparency about data usage

The feedback system is designed to be user-friendly, privacy-preserving, and effective for improving hate speech detection accuracy over time. 