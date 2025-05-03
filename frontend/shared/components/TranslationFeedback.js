/**
 * Translation Feedback Component for MedTranslate AI
 * 
 * This component allows users to provide feedback on translation quality,
 * which is used to improve the adaptive confidence thresholds.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TranslationFeedback({ 
  translationId, 
  originalText, 
  translatedText, 
  confidence, 
  onSubmitFeedback,
  compact = false
}) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(null);
  const [issues, setIssues] = useState([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Get confidence level from either string or object format
  const confidenceLevel = typeof confidence === 'object' ? confidence.level : confidence;

  // Issue types for feedback
  const issueTypes = [
    { id: 'terminology', label: 'Medical terminology issues' },
    { id: 'grammar', label: 'Grammar or syntax errors' },
    { id: 'meaning', label: 'Changed meaning' },
    { id: 'incomplete', label: 'Incomplete translation' },
    { id: 'cultural', label: 'Cultural context issues' }
  ];

  // Toggle issue selection
  const toggleIssue = (issueId) => {
    if (issues.includes(issueId)) {
      setIssues(issues.filter(id => id !== issueId));
    } else {
      setIssues([...issues, issueId]);
    }
  };

  // Submit feedback
  const handleSubmit = () => {
    if (rating === null) return;

    const feedbackData = {
      translationId,
      rating,
      issues,
      comment: comment.trim(),
      timestamp: new Date()
    };

    onSubmitFeedback(feedbackData);
    setSubmitted(true);
    
    // Reset form after a delay
    setTimeout(() => {
      setExpanded(false);
      setSubmitted(false);
    }, 3000);
  };

  // Render compact version (just the button)
  if (compact && !expanded) {
    return (
      <TouchableOpacity 
        style={styles.compactButton}
        onPress={() => setExpanded(true)}
      >
        <Ionicons name="thumbs-up-outline" size={16} color="#0077CC" />
        <Text style={styles.compactButtonText}>Rate Translation</Text>
      </TouchableOpacity>
    );
  }

  // Render thank you message after submission
  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.thankYouContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.thankYouText}>Thank you for your feedback!</Text>
        </View>
      </View>
    );
  }

  // Render full feedback form
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Translation Feedback</Text>
        {expanded && (
          <TouchableOpacity onPress={() => setExpanded(false)}>
            <Ionicons name="close" size={20} color="#757575" />
          </TouchableOpacity>
        )}
      </View>

      {!expanded ? (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setExpanded(true)}
        >
          <Text style={styles.expandButtonText}>Rate this translation</Text>
          <Ionicons name="chevron-down" size={16} color="#0077CC" />
        </TouchableOpacity>
      ) : (
        <View style={styles.feedbackForm}>
          <Text style={styles.sectionTitle}>How accurate was this translation?</Text>
          
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.ratingButton,
                  rating === value && styles.ratingButtonSelected
                ]}
                onPress={() => setRating(value)}
              >
                <Text 
                  style={[
                    styles.ratingText,
                    rating === value && styles.ratingTextSelected
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.ratingLabels}>
            <Text style={styles.ratingLabelText}>Poor</Text>
            <Text style={styles.ratingLabelText}>Excellent</Text>
          </View>

          <Text style={styles.sectionTitle}>Any specific issues? (Optional)</Text>
          
          <View style={styles.issuesContainer}>
            {issueTypes.map((issue) => (
              <TouchableOpacity
                key={issue.id}
                style={[
                  styles.issueButton,
                  issues.includes(issue.id) && styles.issueButtonSelected
                ]}
                onPress={() => toggleIssue(issue.id)}
              >
                <Text 
                  style={[
                    styles.issueText,
                    issues.includes(issue.id) && styles.issueTextSelected
                  ]}
                >
                  {issue.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Additional comments (Optional)</Text>
          
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Enter any additional feedback..."
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              rating === null && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={rating === null}
          >
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#0077CC',
    marginRight: 4,
  },
  feedbackForm: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
    marginTop: 12,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  ratingButtonSelected: {
    backgroundColor: '#0077CC',
    borderColor: '#0077CC',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555555',
  },
  ratingTextSelected: {
    color: '#FFFFFF',
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingLabelText: {
    fontSize: 12,
    color: '#757575',
  },
  issuesContainer: {
    marginVertical: 8,
  },
  issueButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  issueButtonSelected: {
    backgroundColor: '#E1F5FE',
    borderColor: '#0077CC',
  },
  issueText: {
    fontSize: 14,
    color: '#555555',
  },
  issueTextSelected: {
    color: '#0077CC',
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 4,
    padding: 8,
    marginVertical: 8,
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: '#0077CC',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  thankYouContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  thankYouText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  compactButtonText: {
    fontSize: 14,
    color: '#0077CC',
    marginLeft: 4,
  },
});
