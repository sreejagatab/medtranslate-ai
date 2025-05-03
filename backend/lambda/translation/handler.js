/**
 * Lambda handler for the MedTranslate AI translation service
 *
 * This Lambda function handles translation requests, processes audio input,
 * and returns translated text with confidence scores.
 */

const { translateText, verifyMedicalTerminology } = require('./bedrock-client');
const { verifyMedicalTerms, addTermToKB } = require('./medical-kb');
const { transcribeAudio, synthesizeSpeech } = require('./audio-processor');
const { updateThresholdsBasedOnFeedback } = require('./adaptive-confidence');
const endToEndMonitoring = require('../../monitoring/end-to-end-monitoring');

/**
 * Main handler for text translation requests
 */
exports.translateText = async (event) => {
  // Start an end-to-end transaction for this translation request
  let transactionId = null;

  try {
    console.log('Received translation request:', JSON.stringify(event, null, 2));

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      sourceLanguage,
      targetLanguage,
      text,
      medicalContext = 'general',
      verifyTerminology = false,
      sessionId = null
    } = body;

    // Validate required parameters
    if (!sourceLanguage || !targetLanguage || !text) {
      return formatResponse(400, {
        error: 'Missing required parameters: sourceLanguage, targetLanguage, text'
      });
    }

    // Extract user ID from token if available
    let userId = null;
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        try {
          // In a real implementation, we would verify the token
          // For now, we'll just extract the user ID if it's a JWT
          const tokenParts = parts[1].split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            userId = payload.sub;
          }
        } catch (error) {
          console.warn('Error extracting user ID from token:', error);
        }
      }
    }

    // Start transaction
    const transaction = await endToEndMonitoring.startTransaction({
      transactionType: 'translation',
      userId,
      sessionId,
      sourceComponent: 'backend',
      metadata: {
        sourceLanguage,
        targetLanguage,
        medicalContext,
        textLength: text.length,
        verifyTerminology
      }
    });

    transactionId = transaction.transactionId;

    // First check against our medical knowledge base
    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'medical-kb',
      action: 'verify-terms',
      status: 'processing'
    });

    const verifiedTerms = await verifyMedicalTerms(
      text,
      sourceLanguage,
      targetLanguage
    );

    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'medical-kb',
      action: 'verify-terms',
      status: 'success',
      metadata: {
        verifiedTermsCount: verifiedTerms.length
      }
    });

    console.log(`Found ${verifiedTerms.length} verified medical terms in the text`);

    // Perform translation with verified medical terms
    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'bedrock',
      action: 'translate',
      status: 'processing'
    });

    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      text,
      medicalContext,
      null, // No preferred model
      verifiedTerms // Pass verified terms to the translation
    );

    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'bedrock',
      action: 'translate',
      status: 'success',
      metadata: {
        modelUsed: translationResult.modelUsed,
        confidence: translationResult.confidence,
        processingTime: translationResult.processingTime
      }
    });

    // Verify medical terminology if requested
    let terminologyVerification = null;
    if (verifyTerminology) {
      await endToEndMonitoring.updateTransaction({
        transactionId,
        component: 'bedrock',
        action: 'verify-terminology',
        status: 'processing'
      });

      // Use Bedrock for additional verification
      const bedrockVerification = await verifyMedicalTerminology(
        text,
        translationResult.translatedText,
        sourceLanguage,
        targetLanguage,
        medicalContext
      );

      terminologyVerification = {
        knownTerms: verifiedTerms,
        verifiedTerms: bedrockVerification.terms,
        overallAccuracy: bedrockVerification.overallAccuracy
      };

      await endToEndMonitoring.updateTransaction({
        transactionId,
        component: 'bedrock',
        action: 'verify-terminology',
        status: 'success',
        metadata: {
          verifiedTermsCount: bedrockVerification.terms?.length || 0,
          overallAccuracy: bedrockVerification.overallAccuracy
        }
      });

      // Add any new verified terms to the knowledge base
      if (bedrockVerification.terms && bedrockVerification.terms.length > 0) {
        await endToEndMonitoring.updateTransaction({
          transactionId,
          component: 'medical-kb',
          action: 'add-terms',
          status: 'processing'
        });

        console.log(`Adding ${bedrockVerification.terms.length} new verified terms to the knowledge base`);

        for (const term of bedrockVerification.terms) {
          if (term.isAccurate) {
            // Add accurate terms to the knowledge base
            await addTermToKB(
              term.sourceTerm,
              sourceLanguage,
              term.translatedTerm,
              targetLanguage,
              medicalContext,
              'high'
            );
          }
        }

        await endToEndMonitoring.updateTransaction({
          transactionId,
          component: 'medical-kb',
          action: 'add-terms',
          status: 'success',
          metadata: {
            addedTermsCount: bedrockVerification.terms.filter(t => t.isAccurate).length
          }
        });
      }
    }

    // Complete the transaction
    await endToEndMonitoring.completeTransaction({
      transactionId,
      status: 'completed',
      component: 'backend',
      metadata: {
        sourceLanguage,
        targetLanguage,
        medicalContext,
        confidence: translationResult.confidence,
        processingTime: translationResult.processingTime
      }
    });

    // Return the translation result
    return formatResponse(200, {
      sourceLanguage,
      targetLanguage,
      originalText: text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      medicalContext,
      terminologyVerification,
      transactionId
    });
  } catch (error) {
    console.error('Error processing translation request:', error);

    // Record error in transaction if we have a transaction ID
    if (transactionId) {
      try {
        await endToEndMonitoring.completeTransaction({
          transactionId,
          status: 'error',
          component: 'backend',
          errorDetails: {
            message: error.message,
            stack: error.stack
          }
        });
      } catch (monitoringError) {
        console.error('Error recording transaction error:', monitoringError);
      }
    }

    return formatResponse(500, {
      error: 'Translation failed',
      message: error.message,
      transactionId
    });
  }
};

/**
 * Handler for audio translation requests
 */
exports.translateAudio = async (event) => {
  // Start an end-to-end transaction for this audio translation request
  let transactionId = null;

  try {
    console.log('Received audio translation request');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      sourceLanguage,
      targetLanguage,
      audioData,
      medicalContext = 'general',
      returnAudio = true,
      sessionId = null
    } = body;

    // Validate required parameters
    if (!sourceLanguage || !targetLanguage || !audioData) {
      return formatResponse(400, {
        error: 'Missing required parameters: sourceLanguage, targetLanguage, audioData'
      });
    }

    // Extract user ID from token if available
    let userId = null;
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        try {
          // In a real implementation, we would verify the token
          // For now, we'll just extract the user ID if it's a JWT
          const tokenParts = parts[1].split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            userId = payload.sub;
          }
        } catch (error) {
          console.warn('Error extracting user ID from token:', error);
        }
      }
    }

    // Start transaction
    const transaction = await endToEndMonitoring.startTransaction({
      transactionType: 'audio_translation',
      userId,
      sessionId,
      sourceComponent: 'backend',
      metadata: {
        sourceLanguage,
        targetLanguage,
        medicalContext,
        audioDataSize: audioData.length,
        returnAudio
      }
    });

    transactionId = transaction.transactionId;

    // Transcribe the audio
    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'audio-processor',
      action: 'transcribe',
      status: 'processing'
    });

    const transcriptionResult = await transcribeAudio(
      audioData,
      sourceLanguage
    );

    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'audio-processor',
      action: 'transcribe',
      status: 'success',
      metadata: {
        textLength: transcriptionResult.text.length,
        confidence: transcriptionResult.confidence
      }
    });

    // Check for medical terms in the transcribed text
    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'medical-kb',
      action: 'verify-terms',
      status: 'processing'
    });

    const verifiedTerms = await verifyMedicalTerms(
      transcriptionResult.text,
      sourceLanguage,
      targetLanguage
    );

    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'medical-kb',
      action: 'verify-terms',
      status: 'success',
      metadata: {
        verifiedTermsCount: verifiedTerms.length
      }
    });

    console.log(`Found ${verifiedTerms.length} verified medical terms in the audio transcription`);

    // Translate the transcribed text with verified medical terms
    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'bedrock',
      action: 'translate',
      status: 'processing'
    });

    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      transcriptionResult.text,
      medicalContext,
      null, // No preferred model
      verifiedTerms // Pass verified terms to the translation
    );

    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'bedrock',
      action: 'translate',
      status: 'success',
      metadata: {
        modelUsed: translationResult.modelUsed,
        confidence: translationResult.confidence,
        processingTime: translationResult.processingTime
      }
    });

    // Generate audio for the translated text if requested
    let audioResponse = null;
    if (returnAudio) {
      await endToEndMonitoring.updateTransaction({
        transactionId,
        component: 'audio-processor',
        action: 'synthesize',
        status: 'processing'
      });

      audioResponse = await synthesizeSpeech(
        translationResult.translatedText,
        targetLanguage
      );

      await endToEndMonitoring.updateTransaction({
        transactionId,
        component: 'audio-processor',
        action: 'synthesize',
        status: 'success',
        metadata: {
          audioFormat: audioResponse.format,
          audioDataSize: audioResponse.audioData.length
        }
      });
    }

    // Complete the transaction
    await endToEndMonitoring.completeTransaction({
      transactionId,
      status: 'completed',
      component: 'backend',
      metadata: {
        sourceLanguage,
        targetLanguage,
        medicalContext,
        confidence: translationResult.confidence,
        processingTime: translationResult.processingTime,
        returnAudio
      }
    });

    // Return the translation result
    return formatResponse(200, {
      sourceLanguage,
      targetLanguage,
      originalText: transcriptionResult.text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      medicalContext,
      audioResponse: audioResponse ? audioResponse.audioData : null,
      audioFormat: audioResponse ? audioResponse.format : null,
      transactionId
    });
  } catch (error) {
    console.error('Error processing audio translation request:', error);

    // Record error in transaction if we have a transaction ID
    if (transactionId) {
      try {
        await endToEndMonitoring.completeTransaction({
          transactionId,
          status: 'error',
          component: 'backend',
          errorDetails: {
            message: error.message,
            stack: error.stack
          }
        });
      } catch (monitoringError) {
        console.error('Error recording transaction error:', monitoringError);
      }
    }

    return formatResponse(500, {
      error: 'Audio translation failed',
      message: error.message,
      transactionId
    });
  }
};

/**
 * Handler for translation feedback
 */
exports.processFeedback = async (event) => {
  // Start an end-to-end transaction for this feedback request
  let transactionId = null;

  try {
    console.log('Received translation feedback:', JSON.stringify(event, null, 2));

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      translationId,
      sourceLanguage,
      targetLanguage,
      medicalContext = 'general',
      wasAccurate,
      confidenceLevel,
      originalText,
      translatedText,
      feedbackNotes,
      sessionId = null
    } = body;

    // Validate required parameters
    if (!translationId || wasAccurate === undefined || !confidenceLevel) {
      return formatResponse(400, {
        error: 'Missing required parameters: translationId, wasAccurate, confidenceLevel'
      });
    }

    // Extract user ID from token if available
    let userId = null;
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        try {
          // In a real implementation, we would verify the token
          // For now, we'll just extract the user ID if it's a JWT
          const tokenParts = parts[1].split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            userId = payload.sub;
          }
        } catch (error) {
          console.warn('Error extracting user ID from token:', error);
        }
      }
    }

    // Start transaction
    const transaction = await endToEndMonitoring.startTransaction({
      transactionType: 'translation_feedback',
      userId,
      sessionId,
      sourceComponent: 'backend',
      metadata: {
        translationId,
        sourceLanguage,
        targetLanguage,
        medicalContext,
        wasAccurate,
        confidenceLevel,
        hasFeedbackNotes: !!feedbackNotes
      }
    });

    transactionId = transaction.transactionId;

    // Update confidence thresholds based on feedback
    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'adaptive-confidence',
      action: 'update-thresholds',
      status: 'processing'
    });

    const thresholdsUpdated = await updateThresholdsBasedOnFeedback(
      medicalContext,
      sourceLanguage,
      targetLanguage,
      wasAccurate,
      confidenceLevel
    );

    await endToEndMonitoring.updateTransaction({
      transactionId,
      component: 'adaptive-confidence',
      action: 'update-thresholds',
      status: 'success',
      metadata: {
        thresholdsUpdated
      }
    });

    // If the translation was accurate and we have the original terms, add them to the knowledge base
    if (wasAccurate && originalText && translatedText) {
      try {
        await endToEndMonitoring.updateTransaction({
          transactionId,
          component: 'medical-kb',
          action: 'extract-terms',
          status: 'processing'
        });

        // Extract medical terms from the text
        const medicalTermsSource = extractMedicalTermsSimple(originalText, sourceLanguage);
        const medicalTermsTarget = extractMedicalTermsSimple(translatedText, targetLanguage);

        await endToEndMonitoring.updateTransaction({
          transactionId,
          component: 'medical-kb',
          action: 'extract-terms',
          status: 'success',
          metadata: {
            sourceTermsCount: medicalTermsSource.length,
            targetTermsCount: medicalTermsTarget.length
          }
        });

        // If we have terms in both languages, try to match them and add to KB
        if (medicalTermsSource.length > 0 && medicalTermsTarget.length > 0) {
          await endToEndMonitoring.updateTransaction({
            transactionId,
            component: 'medical-kb',
            action: 'add-terms',
            status: 'processing'
          });

          console.log(`Adding ${Math.min(medicalTermsSource.length, medicalTermsTarget.length)} terms to KB based on feedback`);

          // For simplicity, we'll just match terms by position
          // In a real implementation, we would use a more sophisticated matching algorithm
          const termCount = Math.min(medicalTermsSource.length, medicalTermsTarget.length);
          for (let i = 0; i < termCount; i++) {
            await addTermToKB(
              medicalTermsSource[i],
              sourceLanguage,
              medicalTermsTarget[i],
              targetLanguage,
              medicalContext,
              'high'
            );
          }

          await endToEndMonitoring.updateTransaction({
            transactionId,
            component: 'medical-kb',
            action: 'add-terms',
            status: 'success',
            metadata: {
              termsAddedCount: termCount
            }
          });
        }
      } catch (error) {
        console.error('Error adding terms to KB:', error);

        await endToEndMonitoring.updateTransaction({
          transactionId,
          component: 'medical-kb',
          action: 'add-terms',
          status: 'error',
          errorDetails: {
            message: error.message,
            stack: error.stack
          }
        });

        // Continue processing even if term addition fails
      }
    }

    // Complete the transaction
    await endToEndMonitoring.completeTransaction({
      transactionId,
      status: 'completed',
      component: 'backend',
      metadata: {
        translationId,
        wasAccurate,
        confidenceLevel,
        thresholdsUpdated
      }
    });

    // Return success response
    return formatResponse(200, {
      translationId,
      feedbackProcessed: true,
      thresholdsUpdated,
      message: 'Thank you for your feedback',
      transactionId
    });
  } catch (error) {
    console.error('Error processing feedback:', error);

    // Record error in transaction if we have a transaction ID
    if (transactionId) {
      try {
        await endToEndMonitoring.completeTransaction({
          transactionId,
          status: 'error',
          component: 'backend',
          errorDetails: {
            message: error.message,
            stack: error.stack
          }
        });
      } catch (monitoringError) {
        console.error('Error recording transaction error:', monitoringError);
      }
    }

    return formatResponse(500, {
      error: 'Failed to process feedback',
      message: error.message,
      transactionId
    });
  }
};

/**
 * Helper function to format Lambda response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Simple function to extract potential medical terms from text
 * This is a simplified version of the more comprehensive function in medical-kb.js
 *
 * @param {string} text - The text to analyze
 * @param {string} language - The language code
 * @returns {Array<string>} - Array of potential medical terms
 */
function extractMedicalTermsSimple(text, language) {
  // Skip empty text
  if (!text || text.trim() === '') {
    return [];
  }

  // Common medical term patterns
  const medicalPatterns = [
    /\b[A-Z][a-z]+ (disease|syndrome|disorder|condition)\b/g,
    /\b(MRI|CT|CAT|PET|EKG|ECG|EEG|ultrasound|x-ray)\b/gi,
    /\b(diagnosis|prognosis|treatment|therapy)\b/gi,
    /\b(cardiac|pulmonary|hepatic|renal|neural|cerebral)\b/gi,
    /\b(diabetes|hypertension|asthma|arthritis|cancer)\b/gi
  ];

  // Extract terms using regex patterns
  let terms = [];
  for (const pattern of medicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms = [...terms, ...matches];
    }
  }

  // Remove duplicates and convert to lowercase for consistency
  return [...new Set(terms.map(term => term.toLowerCase()))];
}
