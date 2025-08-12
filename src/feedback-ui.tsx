import React, { useState } from 'react';
import { FeedbackManager, type FeedbackData } from './feedback';

interface FeedbackUIProps {
  classification: {
    label: 'hateful' | 'normal';
    confidence: number;
    method: 'ai';
    keywords: string[];
    explanation: string;
  };
  originalText: string;
  elementId?: string;
  onClose: () => void;
}

const FeedbackUI: React.FC<FeedbackUIProps> = ({
  classification,
  originalText,
  elementId: _elementId,
  onClose
}) => {
  const [feedbackType, setFeedbackType] = useState<'false_positive' | 'false_negative' | 'correct' | null>(null);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const feedbackManager = FeedbackManager.getInstance();

  const handleSubmit = async () => {
    if (!feedbackType) return;

    setIsSubmitting(true);
    try {
      const feedbackData: Omit<FeedbackData, 'id' | 'timestamp'> = {
        originalText,
        classification,
        userFeedback: {
          type: feedbackType,
          reason: reason || customReason,
          category: category || undefined
        },
        context: {
          url: window.location.href,
          elementType: 'text',
          pageTitle: document.title
        },
        metadata: {
          modelUsed: 'current-model', // Will be updated by background script
          confidenceThreshold: 0.7, // Will be updated by background script
          extensionVersion: '0.1.0'
        }
      };

      await feedbackManager.submitFeedback(feedbackData);
      setSubmitted(true);
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeedbackReasons = () => {
    const allReasons = feedbackManager.getFeedbackReasons();
    return allReasons.filter(r => r.category === feedbackType);
  };

  const getFeedbackCategories = () => {
    return feedbackManager.getFeedbackCategories();
  };

  if (submitted) {
    return (
      <div className="feedback-success">
        <div className="feedback-success-icon">✅</div>
        <div className="feedback-success-text">Thank you for your feedback!</div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h3>Help Improve Detection</h3>
        <button className="feedback-close" onClick={onClose}>×</button>
      </div>

      <div className="feedback-content">
        <div className="feedback-original-text">
          <strong>Original Text:</strong>
          <div className="text-preview">{originalText}</div>
        </div>

        <div className="feedback-classification">
          <strong>Classification:</strong>
          <div className={`classification-badge ${classification.label}`}>
            {classification.label === 'hateful' ? '🚫 Hateful' : '✅ Normal'}
            <span className="confidence">({Math.round(classification.confidence * 100)}%)</span>
          </div>
        </div>

        <div className="feedback-question">
          <p>Is this classification correct?</p>
        </div>

        <div className="feedback-options">
          <button
            className={`feedback-option ${feedbackType === 'correct' ? 'selected' : ''}`}
            onClick={() => setFeedbackType('correct')}
          >
            ✅ Correct
          </button>
          <button
            className={`feedback-option ${feedbackType === 'false_positive' ? 'selected' : ''}`}
            onClick={() => setFeedbackType('false_positive')}
          >
            ❌ False Positive
          </button>
          <button
            className={`feedback-option ${feedbackType === 'false_negative' ? 'selected' : ''}`}
            onClick={() => setFeedbackType('false_negative')}
          >
            ⚠️ False Negative
          </button>
        </div>

        {feedbackType && feedbackType !== 'correct' && (
          <div className="feedback-details">
            <div className="feedback-reason">
              <label>Reason:</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Select a reason...</option>
                {getFeedbackReasons().map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {reason === 'other_fp' || reason === 'other_fn' && (
              <div className="feedback-custom-reason">
                <label>Custom Reason:</label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify..."
                />
              </div>
            )}

            <div className="feedback-category">
              <label>Category (optional):</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select a category...</option>
                {getFeedbackCategories().map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="feedback-actions">
          <button
            className="feedback-submit"
            onClick={handleSubmit}
            disabled={!feedbackType || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
          <button className="feedback-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles = `
  .feedback-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90vw;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .feedback-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 0;
    border-bottom: 1px solid #e9ecef;
  }

  .feedback-header h3 {
    margin: 0;
    color: #495057;
    font-size: 18px;
  }

  .feedback-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6c757d;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .feedback-close:hover {
    color: #495057;
  }

  .feedback-content {
    padding: 20px;
  }

  .feedback-original-text {
    margin-bottom: 15px;
  }

  .text-preview {
    background: #f8f9fa;
    padding: 10px;
    border-radius: 6px;
    margin-top: 5px;
    font-size: 14px;
    line-height: 1.4;
    max-height: 100px;
    overflow-y: auto;
  }

  .feedback-classification {
    margin-bottom: 20px;
  }

  .classification-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    margin-top: 5px;
  }

  .classification-badge.hateful {
    background: #f8d7da;
    color: #721c24;
  }

  .classification-badge.normal {
    background: #d4edda;
    color: #155724;
  }

  .confidence {
    font-size: 12px;
    opacity: 0.8;
  }

  .feedback-question {
    margin-bottom: 15px;
  }

  .feedback-question p {
    margin: 0;
    font-weight: 500;
    color: #495057;
  }

  .feedback-options {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .feedback-option {
    flex: 1;
    padding: 12px;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .feedback-option:hover {
    border-color: #667eea;
  }

  .feedback-option.selected {
    border-color: #667eea;
    background: #667eea;
    color: white;
  }

  .feedback-details {
    margin-bottom: 20px;
  }

  .feedback-reason,
  .feedback-custom-reason,
  .feedback-category {
    margin-bottom: 15px;
  }

  .feedback-reason label,
  .feedback-custom-reason label,
  .feedback-category label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #495057;
    font-size: 14px;
  }

  .feedback-reason select,
  .feedback-custom-reason input,
  .feedback-category select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 14px;
  }

  .feedback-actions {
    display: flex;
    gap: 10px;
  }

  .feedback-submit,
  .feedback-cancel {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .feedback-submit {
    background: #667eea;
    color: white;
  }

  .feedback-submit:hover:not(:disabled) {
    background: #5a67d8;
  }

  .feedback-submit:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .feedback-cancel {
    background: #6c757d;
    color: white;
  }

  .feedback-cancel:hover {
    background: #5a6268;
  }

  .feedback-success {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .feedback-success-icon {
    font-size: 48px;
    margin-bottom: 15px;
  }

  .feedback-success-text {
    font-size: 16px;
    color: #28a745;
    font-weight: 500;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default FeedbackUI; 