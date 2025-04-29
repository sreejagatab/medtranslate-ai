/**
 * Lambda handler for the MedTranslate AI translation service
 *
 * This Lambda function handles translation requests, processes audio input,
 * and returns translated text with confidence scores.
 */

const { translateText, verifyMedicalTerminology } = require('./bedrock-client');
const { verifyMedicalTerms, addTermToKB } = require('./medical-kb');
const { transcribeAudio, synthesizeSpeech } = require('./audio-processor');

/**
 * Main handler for text translation requests
 */
exports.translateText = async (event) => {
  try {
    console.log('Received translation request:', JSON.stringify(event, null, 2));

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      sourceLanguage,
      targetLanguage,
      text,
      medicalContext = 'general',
      verifyTerminology = false
    } = body;

    // Validate required parameters
    if (!sourceLanguage || !targetLanguage || !text) {
      return formatResponse(400, {
        error: 'Missing required parameters: sourceLanguage, targetLanguage, text'
      });
    }

    // First check against our medical knowledge base
    const verifiedTerms = await verifyMedicalTerms(
      text,
      sourceLanguage,
      targetLanguage
    );

    console.log(`Found ${verifiedTerms.length} verified medical terms in the text`);

    // Perform translation with verified medical terms
    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      text,
      medicalContext,
      null, // No preferred model
      verifiedTerms // Pass verified terms to the translation
    );

    // Verify medical terminology if requested
    let terminologyVerification = null;
    if (verifyTerminology) {
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

      // Add any new verified terms to the knowledge base
      if (bedrockVerification.terms && bedrockVerification.terms.length > 0) {
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
      }
    }

    // Return the translation result
    return formatResponse(200, {
      sourceLanguage,
      targetLanguage,
      originalText: text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      medicalContext,
      terminologyVerification
    });
  } catch (error) {
    console.error('Error processing translation request:', error);
    return formatResponse(500, {
      error: 'Translation failed',
      message: error.message
    });
  }
};

/**
 * Handler for audio translation requests
 */
exports.translateAudio = async (event) => {
  try {
    console.log('Received audio translation request');

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      sourceLanguage,
      targetLanguage,
      audioData,
      medicalContext = 'general',
      returnAudio = true
    } = body;

    // Validate required parameters
    if (!sourceLanguage || !targetLanguage || !audioData) {
      return formatResponse(400, {
        error: 'Missing required parameters: sourceLanguage, targetLanguage, audioData'
      });
    }

    // Transcribe the audio
    const transcriptionResult = await transcribeAudio(
      audioData,
      sourceLanguage
    );

    // Check for medical terms in the transcribed text
    const verifiedTerms = await verifyMedicalTerms(
      transcriptionResult.text,
      sourceLanguage,
      targetLanguage
    );

    console.log(`Found ${verifiedTerms.length} verified medical terms in the audio transcription`);

    // Translate the transcribed text with verified medical terms
    const translationResult = await translateText(
      sourceLanguage,
      targetLanguage,
      transcriptionResult.text,
      medicalContext,
      null, // No preferred model
      verifiedTerms // Pass verified terms to the translation
    );

    // Generate audio for the translated text if requested
    let audioResponse = null;
    if (returnAudio) {
      audioResponse = await synthesizeSpeech(
        translationResult.translatedText,
        targetLanguage
      );
    }

    // Return the translation result
    return formatResponse(200, {
      sourceLanguage,
      targetLanguage,
      originalText: transcriptionResult.text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      medicalContext,
      audioResponse: audioResponse ? audioResponse.audioData : null,
      audioFormat: audioResponse ? audioResponse.format : null
    });
  } catch (error) {
    console.error('Error processing audio translation request:', error);
    return formatResponse(500, {
      error: 'Audio translation failed',
      message: error.message
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
