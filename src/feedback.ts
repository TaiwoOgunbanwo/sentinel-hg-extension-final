// Feedback system for Sentinel HG extension
export interface FeedbackData {
  id: string;
  timestamp: number;
  originalText: string;
  classification: {
    label: 'hateful' | 'normal';
    confidence: number;
    method: 'ai';
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

export interface FeedbackStats {
  totalFeedback: number;
  falsePositives: number;
  falseNegatives: number;
  correctClassifications: number;
  accuracy: number;
  recentFeedback: FeedbackData[];
}

export class FeedbackManager {
  private static instance: FeedbackManager;
  private feedbackKey = 'sentinel_hg_feedback';
  private statsKey = 'sentinel_hg_feedback_stats';

  private constructor() {}

  static getInstance(): FeedbackManager {
    if (!FeedbackManager.instance) {
      FeedbackManager.instance = new FeedbackManager();
    }
    return FeedbackManager.instance;
  }

  async submitFeedback(feedback: Omit<FeedbackData, 'id' | 'timestamp'>): Promise<void> {
    try {
      const feedbackData: FeedbackData = {
        ...feedback,
        id: this.generateId(),
        timestamp: Date.now()
      };

      // Get existing feedback
      const result = await chrome.storage.local.get([this.feedbackKey]);
      const existingFeedback: FeedbackData[] = result[this.feedbackKey] || [];

      // Add new feedback (keep last 1000 entries)
      const updatedFeedback = [feedbackData, ...existingFeedback].slice(0, 1000);

      // Save feedback
      await chrome.storage.local.set({ [this.feedbackKey]: updatedFeedback });

      // Update stats
      await this.updateStats(feedbackData);

      console.log('Feedback submitted successfully:', feedbackData.id);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }

  async getFeedbackStats(): Promise<FeedbackStats> {
    try {
      const result = await chrome.storage.local.get([this.statsKey, this.feedbackKey]);
      const stats = result[this.statsKey] || this.getDefaultStats();
      const recentFeedback: FeedbackData[] = result[this.feedbackKey] || [];

      return {
        ...stats,
        recentFeedback: recentFeedback.slice(0, 50) // Last 50 feedback entries
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return this.getDefaultStats();
    }
  }

  async getAllFeedback(): Promise<FeedbackData[]> {
    try {
      const result = await chrome.storage.local.get([this.feedbackKey]);
      return result[this.feedbackKey] || [];
    } catch (error) {
      console.error('Error getting all feedback:', error);
      return [];
    }
  }

  async clearFeedback(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.feedbackKey, this.statsKey]);
      console.log('Feedback cleared successfully');
    } catch (error) {
      console.error('Error clearing feedback:', error);
      throw error;
    }
  }

  async exportFeedback(): Promise<string> {
    try {
      const feedback = await this.getAllFeedback();
      const stats = await this.getFeedbackStats();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        stats,
        feedback
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting feedback:', error);
      throw error;
    }
  }

  private async updateStats(newFeedback: FeedbackData): Promise<void> {
    try {
      const currentStats = await this.getFeedbackStats();
      
      // Update counts
      currentStats.totalFeedback++;
      
      switch (newFeedback.userFeedback.type) {
        case 'false_positive':
          currentStats.falsePositives++;
          break;
        case 'false_negative':
          currentStats.falseNegatives++;
          break;
        case 'correct':
          currentStats.correctClassifications++;
          break;
      }

      // Calculate accuracy
      const totalClassified = currentStats.falsePositives + currentStats.falseNegatives + currentStats.correctClassifications;
      currentStats.accuracy = totalClassified > 0 ? currentStats.correctClassifications / totalClassified : 0;

      // Save updated stats
      await chrome.storage.local.set({ [this.statsKey]: currentStats });
    } catch (error) {
      console.error('Error updating feedback stats:', error);
    }
  }

  private generateId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultStats(): FeedbackStats {
    return {
      totalFeedback: 0,
      falsePositives: 0,
      falseNegatives: 0,
      correctClassifications: 0,
      accuracy: 0,
      recentFeedback: []
    };
  }

  // Helper methods for common feedback reasons
  getFeedbackReasons(): { value: string; label: string; category: string }[] {
    return [
      // False Positive reasons
      { value: 'sarcasm', label: 'Sarcasm or Irony', category: 'false_positive' },
      { value: 'context', label: 'Missing Context', category: 'false_positive' },
      { value: 'joke', label: 'Joke or Humor', category: 'false_positive' },
      { value: 'criticism', label: 'Constructive Criticism', category: 'false_positive' },
      { value: 'discussion', label: 'Academic Discussion', category: 'false_positive' },
      { value: 'quote', label: 'Quoted Content', category: 'false_positive' },
      { value: 'other_fp', label: 'Other (False Positive)', category: 'false_positive' },

      // False Negative reasons
      { value: 'subtle_hate', label: 'Subtle Hate Speech', category: 'false_negative' },
      { value: 'coded_language', label: 'Coded Language', category: 'false_negative' },
      { value: 'implicit_bias', label: 'Implicit Bias', category: 'false_negative' },
      { value: 'microaggression', label: 'Microaggression', category: 'false_negative' },
      { value: 'dog_whistle', label: 'Dog Whistle', category: 'false_negative' },
      { value: 'other_fn', label: 'Other (False Negative)', category: 'false_negative' }
    ];
  }

  getFeedbackCategories(): { value: string; label: string }[] {
    return [
      { value: 'racism', label: 'Racism' },
      { value: 'sexism', label: 'Sexism' },
      { value: 'homophobia', label: 'Homophobia' },
      { value: 'transphobia', label: 'Transphobia' },
      { value: 'religious', label: 'Religious Discrimination' },
      { value: 'disability', label: 'Disability Discrimination' },
      { value: 'ageism', label: 'Ageism' },
      { value: 'classism', label: 'Classism' },
      { value: 'xenophobia', label: 'Xenophobia' },
      { value: 'general', label: 'General Hate Speech' },
      { value: 'other', label: 'Other' }
    ];
  }
} 