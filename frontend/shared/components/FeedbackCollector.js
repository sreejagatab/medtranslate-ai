/**
 * Feedback Collector Component for MedTranslate AI
 * 
 * This component provides a UI for collecting user feedback during usability testing.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Feedback types
const FEEDBACK_TYPES = [
  { id: 'usability', label: 'Usability', icon: 'hand-left' },
  { id: 'performance', label: 'Performance', icon: 'speedometer' },
  { id: 'design', label: 'Design', icon: 'color-palette' },
  { id: 'functionality', label: 'Functionality', icon: 'cog' },
  { id: 'suggestion', label: 'Suggestion', icon: 'bulb' },
  { id: 'bug', label: 'Bug Report', icon: 'bug' }
];

// Rating options
const RATING_OPTIONS = [1, 2, 3, 4, 5];

const FeedbackCollector = ({ 
  isVisible, 
  onClose, 
  onSubmit,
  componentName,
  screenName
}) => {
  // State
  const [feedbackType, setFeedbackType] = useState('usability');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form
  const resetForm = () => {
    setFeedbackType('usability');
    setRating(0);
    setComment('');
    setIsSubmitting(false);
  };
  
  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Handle submit
  const handleSubmit = async () => {
    // Validate form
    if (rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }
    
    if (!comment.trim()) {
      Alert.alert('Error', 'Please provide a comment');
      return;
    }
    
    // Set submitting state
    setIsSubmitting(true);
    
    try {
      // Create feedback object
      const feedback = {
        type: feedbackType,
        rating,
        comment: comment.trim(),
        email: email.trim() || null,
        component: componentName,
        screen: screenName,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        version: '1.0.0' // App version
      };
      
      // Submit feedback
      await onSubmit(feedback);
      
      // Reset form
      resetForm();
      
      // Close modal
      onClose();
      
      // Show success message
      Alert.alert('Thank You', 'Your feedback has been submitted successfully!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Provide Feedback</Text>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color="#757575" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            {/* Component info */}
            {(componentName || screenName) && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  {componentName && `Component: ${componentName}`}
                  {componentName && screenName && '\n'}
                  {screenName && `Screen: ${screenName}`}
                </Text>
              </View>
            )}
            
            {/* Feedback type */}
            <Text style={styles.sectionTitle}>Feedback Type</Text>
            <View style={styles.feedbackTypeContainer}>
              {FEEDBACK_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.feedbackTypeButton,
                    feedbackType === type.id && styles.feedbackTypeButtonActive
                  ]}
                  onPress={() => setFeedbackType(type.id)}
                >
                  <Ionicons
                    name={type.icon}
                    size={20}
                    color={feedbackType === type.id ? '#FFFFFF' : '#333333'}
                  />
                  <Text
                    style={[
                      styles.feedbackTypeLabel,
                      feedbackType === type.id && styles.feedbackTypeLabelActive
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Rating */}
            <Text style={styles.sectionTitle}>Rating</Text>
            <View style={styles.ratingContainer}>
              {RATING_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.ratingButton,
                    rating === option && styles.ratingButtonActive
                  ]}
                  onPress={() => setRating(option)}
                >
                  <Text
                    style={[
                      styles.ratingButtonText,
                      rating === option && styles.ratingButtonTextActive
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.ratingLabels}>
              <Text style={styles.ratingLabelPoor}>Poor</Text>
              <Text style={styles.ratingLabelExcellent}>Excellent</Text>
            </View>
            
            {/* Comment */}
            <Text style={styles.sectionTitle}>Comments</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Please share your thoughts..."
              placeholderTextColor="#999999"
              multiline={true}
              numberOfLines={5}
              textAlignVertical="top"
              value={comment}
              onChangeText={setComment}
            />
            
            {/* Email (optional) */}
            <Text style={styles.sectionTitle}>Email (Optional)</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Your email for follow-up"
              placeholderTextColor="#999999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            
            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (rating === 0 || !comment.trim() || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || !comment.trim() || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  closeButton: {
    padding: 4
  },
  scrollView: {
    padding: 16
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  infoText: {
    fontSize: 14,
    color: '#0D47A1',
    lineHeight: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  feedbackTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  feedbackTypeButtonActive: {
    backgroundColor: '#0077CC'
  },
  feedbackTypeLabel: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 4
  },
  feedbackTypeLabelActive: {
    color: '#FFFFFF'
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  ratingButtonActive: {
    backgroundColor: '#0077CC'
  },
  ratingButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333'
  },
  ratingButtonTextActive: {
    color: '#FFFFFF'
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  ratingLabelPoor: {
    fontSize: 12,
    color: '#757575'
  },
  ratingLabelExcellent: {
    fontSize: 12,
    color: '#757575'
  },
  commentInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 120,
    marginBottom: 16
  },
  emailInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    marginBottom: 24
  },
  submitButton: {
    backgroundColor: '#0077CC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

export default FeedbackCollector;
