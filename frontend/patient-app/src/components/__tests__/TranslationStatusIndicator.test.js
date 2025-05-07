/**
 * Tests for the Enhanced Translation Status Indicator Component
 *
 * This file contains tests for the TranslationStatusIndicator component
 * including tests for adaptive confidence thresholds based on medical context.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TranslationStatusIndicator from '../TranslationStatusIndicator';

describe('TranslationStatusIndicator', () => {
  // Test basic rendering
  test('renders correctly in idle state', () => {
    const { getByText } = render(<TranslationStatusIndicator />);
    expect(getByText('Ready')).toBeTruthy();
  });

  // Test different status types
  test('renders correctly in recording state', () => {
    const { getByText } = render(<TranslationStatusIndicator status="recording" />);
    expect(getByText('Recording...')).toBeTruthy();
  });

  test('renders correctly in processing state', () => {
    const { getByText } = render(<TranslationStatusIndicator status="processing" />);
    expect(getByText('Processing...')).toBeTruthy();
  });

  test('renders correctly in translating state', () => {
    const { getByText } = render(<TranslationStatusIndicator status="translating" />);
    expect(getByText('Translating...')).toBeTruthy();
  });

  test('renders correctly in completed state', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
      />
    );
    expect(getByText('Translation Complete')).toBeTruthy();
    expect(getByText('High')).toBeTruthy();
  });

  test('renders correctly in error state', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="error"
        errorMessage="Translation failed"
      />
    );
    expect(getByText('Translation Error')).toBeTruthy();
    expect(getByText('Translation failed')).toBeTruthy();
  });

  // Test confidence levels
  test('renders high confidence correctly', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
      />
    );
    expect(getByText('High')).toBeTruthy();
  });

  test('renders medium confidence correctly', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="medium"
      />
    );
    expect(getByText('Medium')).toBeTruthy();
  });

  test('renders low confidence correctly', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="low"
      />
    );
    expect(getByText('Low')).toBeTruthy();
  });

  // Test details view
  test('renders details view correctly', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
        processingTime={1.5}
        showDetails={true}
      />
    );
    expect(getByText('Confidence:')).toBeTruthy();
    expect(getByText('Processing Time:')).toBeTruthy();
    expect(getByText('1.5s')).toBeTruthy();
    expect(getByText('Key Factors:')).toBeTruthy();
    expect(getByText('View More Details')).toBeTruthy();
  });

  // Test error details view
  test('renders error details view correctly', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="error"
        errorMessage="Translation failed"
        showDetails={true}
      />
    );
    expect(getByText('Error Details:')).toBeTruthy();
    expect(getByText('Translation failed')).toBeTruthy();
    expect(getByText('Troubleshooting Tips:')).toBeTruthy();
  });

  // Test retry button
  test('retry button calls onRetry callback', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <TranslationStatusIndicator
        status="error"
        errorMessage="Translation failed"
        onRetry={onRetry}
        showDetails={true}
      />
    );
    fireEvent.press(getByText('Retry Translation'));
    expect(onRetry).toHaveBeenCalled();
  });

  // Test custom confidence factors
  test('renders custom confidence factors correctly', () => {
    const customFactors = [
      'Custom factor 1',
      'Custom factor 2'
    ];
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
        confidenceFactors={customFactors}
        showDetails={true}
      />
    );
    expect(getByText('Custom factor 1')).toBeTruthy();
    expect(getByText('Custom factor 2')).toBeTruthy();
  });

  // Test translation model display
  test('renders translation model correctly', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
        translationModel="AWS Bedrock Claude 3 Sonnet"
        showDetails={true}
      />
    );
    expect(getByText('Model:')).toBeTruthy();
    expect(getByText('AWS Bedrock Claude 3 Sonnet')).toBeTruthy();
  });

  // Test progress animation
  test('updates progress correctly', () => {
    const { rerender, getByTestId } = render(
      <TranslationStatusIndicator
        status="processing"
        progress={0.5}
        testID="progress-bar"
      />
    );

    // Update progress
    rerender(
      <TranslationStatusIndicator
        status="processing"
        progress={0.8}
        testID="progress-bar"
      />
    );

    // Note: Testing animations is limited in React Native Testing Library
    // This is a basic check that the component doesn't crash when progress changes
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  // Test medical context-specific confidence descriptions
  test('renders context-specific confidence information for cardiology', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
        medicalContext="cardiology"
        showDetails={true}
      />
    );

    // Check for cardiology context label
    expect(getByText(/\(Cardiology\)/)).toBeTruthy();
  });

  // Test medical context-specific confidence factors
  test('renders context-specific confidence factors for neurology', () => {
    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
        medicalContext="neurology"
        showDetails={true}
      />
    );

    // The component should show the first two factors from the neurology context
    expect(getByText(/Neurological terminology correctly translated/)).toBeTruthy();
  });

  // Test adaptive thresholds display
  test('displays adaptive thresholds indicator when provided', () => {
    const mockAdaptiveThresholds = {
      high: 0.92,
      medium: 0.8,
      low: 0.65,
      analysis: {
        contextComplexity: 1.4,
        terminologyComplexity: 1.2,
        terminologyDensity: 0.3,
        criticalTermsCount: 2
      }
    };

    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="high"
        medicalContext="cardiology"
        adaptiveThresholds={mockAdaptiveThresholds}
        showDetails={true}
      />
    );

    // Check for adaptive thresholds indicator
    expect(getByText(/Using adaptive thresholds for cardiology context/)).toBeTruthy();
  });

  // Test emergency context with adaptive thresholds
  test('renders emergency context with adaptive thresholds correctly', () => {
    const mockAdaptiveThresholds = {
      high: 0.93,
      medium: 0.82,
      low: 0.7,
      analysis: {
        contextComplexity: 1.7,
        terminologyComplexity: 1.5,
        terminologyDensity: 0.4,
        criticalTermsCount: 3,
        isComplexLanguagePair: true
      }
    };

    const { getByText } = render(
      <TranslationStatusIndicator
        status="completed"
        confidence="medium"
        medicalContext="emergency"
        adaptiveThresholds={mockAdaptiveThresholds}
        showDetails={true}
      />
    );

    // Check for emergency context label
    expect(getByText(/\(Emergency\)/)).toBeTruthy();

    // Check for adaptive thresholds indicator
    expect(getByText(/Using adaptive thresholds for emergency context/)).toBeTruthy();
  });
});
