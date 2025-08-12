// Model configuration for AI-only hate speech detection
export interface ModelConfig {
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

export const HATE_SPEECH_MODELS: ModelConfig[] = [
  {
    name: 'Twitter Hate Speech Detector',
    description: 'RoBERTa model fine-tuned for Twitter hate speech detection - AI-only classification',
    modelId: 'cardiffnlp/twitter-roberta-base-hate',
    task: 'text-classification',
    labels: {
      hateful: ['hate', 'offensive'],
      normal: ['normal', 'not-hate', 'not-offensive']
    },
    confidenceThreshold: 0.7,
    maxTextLength: 512
  },
  {
    name: 'Toxic Comment Classifier',
    description: 'BERT model for toxic comment classification - AI-only classification',
    modelId: 'unitary/toxic-bert',
    task: 'text-classification',
    labels: {
      hateful: ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'],
      normal: ['not-toxic', 'not-severe_toxic', 'not-obscene', 'not-threat', 'not-insult', 'not-identity_hate']
    },
    confidenceThreshold: 0.7,
    maxTextLength: 512
  },
  {
    name: 'Hate Speech Detector',
    description: 'Facebook RoBERTa model for hate speech detection - AI-only classification',
    modelId: 'facebook/roberta-hate-speech-detector',
    task: 'text-classification',
    labels: {
      hateful: ['hate', 'offensive'],
      normal: ['normal', 'not-hate', 'not-offensive']
    },
    confidenceThreshold: 0.7,
    maxTextLength: 512
  }
];

// Default model configuration
export const DEFAULT_MODEL: ModelConfig = HATE_SPEECH_MODELS[0];

// Model loading options
export const MODEL_LOADING_OPTIONS = {
  quantized: true,
  progress_callback: (progress: number) => {
    console.log('Model loading progress:', Math.round(progress * 100) + '%');
  }
};

// Text preprocessing optimized for AI models
export const TEXT_PREPROCESSING = {
  maxLength: 512,
  truncation: true,
  removeUrls: true,
  removeEmojis: false,
  normalizeWhitespace: true,
  preserveContext: true // Important for AI understanding
};

// Helper function to preprocess text for AI models
export function preprocessText(text: string): string {
  let processed = text;
  
  if (TEXT_PREPROCESSING.removeUrls) {
    processed = processed.replace(/https?:\/\/[^\s]+/g, '');
  }
  
  if (TEXT_PREPROCESSING.normalizeWhitespace) {
    processed = processed.replace(/\s+/g, ' ').trim();
  }
  
  if (TEXT_PREPROCESSING.maxLength && processed.length > TEXT_PREPROCESSING.maxLength) {
    processed = processed.substring(0, TEXT_PREPROCESSING.maxLength);
  }
  
  return processed;
} 