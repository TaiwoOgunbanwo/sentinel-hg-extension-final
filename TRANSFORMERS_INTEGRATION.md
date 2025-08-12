# Transformers.js Integration Guide

This document explains how the Sentinel HG extension integrates with Transformers.js for AI-only hate speech detection.

## Overview

The extension uses pre-trained hate speech detection models from Hugging Face via Transformers.js, providing sophisticated and accurate detection capabilities. **The extension now operates exclusively with AI models - no rule-based or keyword-based detection is used.**

## Architecture

### 1. **AI-Only Model Configuration** (`src/model-config.ts`)

The extension uses a centralized model configuration system that allows easy switching between different AI-powered hate speech detection models:

```typescript
interface ModelConfig {
  name: string;
  description: string;
  modelId: string;
  task: 'text-classification' | 'sentiment-analysis';
  labels: {
    hateful: string[];
    normal: string[];
  };
  confidenceThreshold: number;
  maxTextLength: number;
}
```

### 2. **Available AI Models**

The extension supports multiple pre-trained AI models:

#### Twitter Hate Speech Detector
- **Model**: `cardiffnlp/twitter-roberta-base-hate`
- **Description**: RoBERTa model fine-tuned for Twitter hate speech detection - AI-only classification
- **Labels**: `hate`, `offensive`, `normal`, `not-hate`, `not-offensive`

#### Toxic Comment Classifier
- **Model**: `unitary/toxic-bert`
- **Description**: BERT model for toxic comment classification - AI-only classification
- **Labels**: `toxic`, `severe_toxic`, `obscene`, `threat`, `insult`, `identity_hate`

#### Facebook Hate Speech Detector
- **Model**: `facebook/roberta-hate-speech-detector`
- **Description**: Facebook RoBERTa model for hate speech detection - AI-only classification
- **Labels**: `hate`, `offensive`, `normal`, `not-hate`, `not-offensive`

### 3. **AI-Optimized Text Preprocessing**

The extension includes preprocessing specifically designed for AI models:

```typescript
export function preprocessText(text: string): string {
  let processed = text;
  
  // Remove URLs
  if (TEXT_PREPROCESSING.removeUrls) {
    processed = processed.replace(/https?:\/\/[^\s]+/g, '');
  }
  
  // Normalize whitespace
  if (TEXT_PREPROCESSING.normalizeWhitespace) {
    processed = processed.replace(/\s+/g, ' ').trim();
  }
  
  // Truncate to max length
  if (TEXT_PREPROCESSING.maxLength && processed.length > TEXT_PREPROCESSING.maxLength) {
    processed = processed.substring(0, TEXT_PREPROCESSING.maxLength);
  }
  
  return processed;
}
```

## Implementation Details

### 1. **AI Model Loading** (`src/background.ts`)

AI models are loaded dynamically in the background service worker:

```typescript
private async loadAIModel(): Promise<void> {
  const modelName = this.settings.selectedModel;
  this.classifier = await pipeline('text-classification', modelName, {
    quantized: true, // Use quantized model for better performance
    progress_callback: (progress: number) => {
      console.log(`AI model loading progress: ${Math.round(progress * 100)}%`);
    }
  });
}
```

### 2. **AI-Only Classification Process**

The classification process follows these steps:

1. **Text Preprocessing**: Clean and normalize the input text for AI analysis
2. **AI Model Inference**: Run the text through the selected AI model
3. **Result Processing**: Interpret AI model outputs based on configured labels
4. **Confidence Calculation**: Determine if confidence meets threshold
5. **Contextual Keyword Extraction**: Extract relevant keywords based on AI analysis

### 3. **No Fallback System**

The extension operates exclusively with AI models. If the AI model fails to load or classify, the extension will:
- Return a default "normal" classification
- Log appropriate error messages
- Continue to attempt AI model loading

## Performance Optimizations

### 1. **Quantized AI Models**
- Uses quantized models for faster inference
- Reduces model size and memory usage
- Maintains accuracy while improving performance

### 2. **AI Model Caching**
- Models are loaded once and cached in memory
- Subsequent classifications use the cached model
- Reduces loading time for repeated use

### 3. **Batch Processing**
- Content script processes elements in batches
- Prevents UI blocking during AI classification
- Improves user experience

## Configuration Options

### Model Selection
Users can select different AI models based on their needs:
- **Twitter-focused**: Use Twitter hate speech detector
- **General toxicity**: Use toxic comment classifier
- **Balanced**: Use Facebook hate speech detector

### Confidence Threshold
Adjustable confidence threshold (50% - 95%) to control AI detection sensitivity:
- **Lower threshold**: More detections, higher false positives
- **Higher threshold**: Fewer detections, lower false positives

### Text Preprocessing
Configurable preprocessing options optimized for AI models:
- URL removal
- Whitespace normalization
- Text length limits
- Context preservation

## Usage Examples

### Basic AI Classification
```typescript
const result = await classifyText("This is some hateful content");
// Returns: { label: 'hateful', confidence: 0.85, method: 'ai' }
```

### AI Model Switching
```typescript
// Switch to toxic comment classifier
settings.selectedModel = 'unitary/toxic-bert';
await loadAIModel(); // Reloads the new AI model
```

### AI-Optimized Preprocessing
```typescript
const processed = preprocessText("Raw text with URLs https://example.com");
// Returns: "Raw text with URLs"
```

## Troubleshooting

### Common Issues

1. **AI Model Loading Failures**
   - Check internet connection
   - Verify model ID is correct
   - Check browser console for errors

2. **Performance Issues**
   - Use quantized models
   - Reduce text length limits
   - Increase confidence threshold

3. **Memory Issues**
   - AI models are automatically cached
   - Consider unloading unused models
   - Monitor memory usage in DevTools

### Debug Information

The extension provides comprehensive logging:
- AI model loading progress
- Classification results
- Error messages
- Performance metrics

## Future Enhancements

### Planned Features
1. **AI Model Fine-tuning**: Allow custom model training
2. **Multi-language AI Support**: Add AI models for different languages
3. **Real-time AI Updates**: Dynamic model switching
4. **AI Performance Monitoring**: Detailed analytics and metrics

### AI Model Improvements
1. **Ensemble AI Methods**: Combine multiple AI models
2. **Context-Aware AI**: Consider surrounding text
3. **Domain Adaptation**: Specialized AI models for different platforms

## Security Considerations

### Privacy
- All AI processing happens client-side
- No text is sent to external servers
- AI models are downloaded and cached locally

### AI Model Validation
- Use trusted AI model sources (Hugging Face)
- Validate AI model outputs
- Implement error handling for AI failures

### Performance Security
- Monitor memory usage for AI models
- Implement timeout mechanisms
- Handle AI model loading failures gracefully

## AI-Only Benefits

### 1. **Superior Accuracy**
- AI models understand context and nuance
- Better at detecting subtle hate speech
- Reduced false positives from simple keyword matching

### 2. **Contextual Understanding**
- AI models can distinguish between hate speech and legitimate criticism
- Better handling of sarcasm, irony, and academic discussions
- Understanding of cultural and linguistic nuances

### 3. **Continuous Improvement**
- AI models can be updated and improved
- Feedback data can be used to fine-tune models
- Better adaptation to evolving language patterns

### 4. **Sophisticated Analysis**
- Multi-label classification capabilities
- Confidence scoring based on model training
- Explanation generation for classifications

The AI-only approach ensures that all hate speech detection is performed by sophisticated machine learning models, providing more accurate and nuanced results than traditional rule-based systems. 