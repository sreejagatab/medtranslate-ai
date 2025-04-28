/**
 * Audio processing module for MedTranslate AI
 *
 * This module handles audio transcription and speech synthesis
 * using AWS services.
 */

const AWS = require('aws-sdk');

// Initialize AWS services only if not in development mode
const transcribe = process.env.NODE_ENV !== 'development' ? new AWS.TranscribeService() : null;
const polly = process.env.NODE_ENV !== 'development' ? new AWS.Polly() : null;
const s3 = process.env.NODE_ENV !== 'development' ? new AWS.S3() : null;

/**
 * Transcribes audio data to text
 *
 * @param {string} audioData - Base64-encoded audio data
 * @param {string} languageCode - The language code (e.g., 'en-US', 'es-ES')
 * @returns {Promise<Object>} - Transcription result
 */
async function transcribeAudio(audioData, languageCode) {
  try {
    // For local development, use mock implementation
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Transcribing audio in ${languageCode}`);

      // Return mock transcription based on language
      const baseLanguage = languageCode.split('-')[0];

      if (baseLanguage === 'en') {
        return {
          text: 'Hello, how are you feeling today?',
          confidence: 0.95,
          jobName: 'mock-job'
        };
      } else if (baseLanguage === 'es') {
        return {
          text: 'Hola, ¿cómo te sientes hoy?',
          confidence: 0.92,
          jobName: 'mock-job'
        };
      } else if (baseLanguage === 'fr') {
        return {
          text: 'Bonjour, comment vous sentez-vous aujourd\'hui?',
          confidence: 0.90,
          jobName: 'mock-job'
        };
      } else {
        return {
          text: `[Transcription in ${baseLanguage}]`,
          confidence: 0.80,
          jobName: 'mock-job'
        };
      }
    }

    // Convert language code to Transcribe format if needed
    const transcribeLanguage = convertToTranscribeLanguageCode(languageCode);

    // Generate a unique job name
    const jobName = `medtranslate-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Upload audio to S3 temporarily
    const bucket = process.env.AUDIO_BUCKET || 'medtranslate-audio';
    const key = `temp/${jobName}.wav`;

    await s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(audioData, 'base64'),
      ContentType: 'audio/wav'
    }).promise();

    // Start transcription job
    const transcriptionParams = {
      TranscriptionJobName: jobName,
      LanguageCode: transcribeLanguage,
      MediaFormat: 'wav',
      Media: {
        MediaFileUri: `s3://${bucket}/${key}`
      },
      Settings: {
        ShowSpeakerLabels: false,
        MaxSpeakerLabels: 2,
        ShowAlternatives: false
      }
    };

    await transcribe.startTranscriptionJob(transcriptionParams).promise();

    // Poll for job completion
    let jobStatus = 'IN_PROGRESS';
    let transcriptionResult;

    while (jobStatus === 'IN_PROGRESS') {
      // Wait before checking status
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get job status
      const jobData = await transcribe.getTranscriptionJob({
        TranscriptionJobName: jobName
      }).promise();

      jobStatus = jobData.TranscriptionJob.TranscriptionJobStatus;

      if (jobStatus === 'COMPLETED') {
        // Get the transcript
        const transcriptUri = jobData.TranscriptionJob.Transcript.TranscriptFileUri;
        const response = await fetch(transcriptUri);
        const data = await response.json();

        transcriptionResult = {
          text: data.results.transcripts[0].transcript,
          confidence: calculateAverageConfidence(data.results.items),
          jobName
        };
      } else if (jobStatus === 'FAILED') {
        throw new Error(`Transcription job failed: ${jobData.TranscriptionJob.FailureReason}`);
      }
    }

    // Clean up S3 file
    await s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise();

    return transcriptionResult;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Audio transcription failed: ${error.message}`);
  }
}

/**
 * Synthesizes speech from text
 *
 * @param {string} text - The text to synthesize
 * @param {string} languageCode - The language code
 * @returns {Promise<Object>} - Synthesized speech data
 */
async function synthesizeSpeech(text, languageCode) {
  try {
    // For local development, use mock implementation
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Synthesizing speech in ${languageCode}: ${text}`);

      // Return mock audio data
      return {
        audioData: 'base64_encoded_audio_data',
        format: 'mp3',
        languageCode
      };
    }

    // Convert language code to Polly format and select voice
    const { voiceId, engine } = selectPollyVoice(languageCode);

    // Synthesize speech
    const params = {
      Engine: engine,
      OutputFormat: 'mp3',
      SampleRate: '22050',
      Text: text,
      TextType: 'text',
      VoiceId: voiceId
    };

    const result = await polly.synthesizeSpeech(params).promise();

    // Convert audio buffer to base64
    const audioData = result.AudioStream.toString('base64');

    return {
      audioData,
      format: 'mp3',
      languageCode
    };
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw new Error(`Speech synthesis failed: ${error.message}`);
  }
}

/**
 * Converts a general language code to Transcribe-specific format
 *
 * @param {string} languageCode - The language code to convert
 * @returns {string} - Transcribe language code
 */
function convertToTranscribeLanguageCode(languageCode) {
  // Map of language codes to Transcribe language codes
  const languageMap = {
    'en': 'en-US',
    'es': 'es-US',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'zh': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'ru': 'ru-RU'
  };

  // If the language code is already in the correct format, return it
  if (languageCode.includes('-')) {
    return languageCode;
  }

  // Otherwise, look up the mapping
  return languageMap[languageCode] || 'en-US';
}

/**
 * Selects an appropriate Polly voice for a language
 *
 * @param {string} languageCode - The language code
 * @returns {Object} - Voice ID and engine type
 */
function selectPollyVoice(languageCode) {
  // Map of language codes to Polly voices
  const voiceMap = {
    'en': { voiceId: 'Joanna', engine: 'neural' },
    'es': { voiceId: 'Lupe', engine: 'neural' },
    'fr': { voiceId: 'Léa', engine: 'neural' },
    'de': { voiceId: 'Vicki', engine: 'neural' },
    'it': { voiceId: 'Bianca', engine: 'neural' },
    'pt': { voiceId: 'Camila', engine: 'neural' },
    'zh': { voiceId: 'Zhiyu', engine: 'neural' },
    'ja': { voiceId: 'Takumi', engine: 'neural' },
    'ko': { voiceId: 'Seoyeon', engine: 'neural' },
    'ar': { voiceId: 'Zeina', engine: 'standard' },
    'hi': { voiceId: 'Aditi', engine: 'standard' },
    'ru': { voiceId: 'Tatyana', engine: 'standard' }
  };

  // Extract the base language code if needed
  const baseLanguage = languageCode.split('-')[0];

  // Return the appropriate voice or a default
  return voiceMap[baseLanguage] || { voiceId: 'Joanna', engine: 'neural' };
}

/**
 * Calculates the average confidence score from transcription items
 *
 * @param {Array} items - Transcription items with confidence scores
 * @returns {number} - Average confidence score
 */
function calculateAverageConfidence(items) {
  if (!items || items.length === 0) {
    return 0;
  }

  let totalConfidence = 0;
  let itemsWithConfidence = 0;

  for (const item of items) {
    if (item.alternatives && item.alternatives[0] && item.alternatives[0].confidence) {
      totalConfidence += parseFloat(item.alternatives[0].confidence);
      itemsWithConfidence++;
    }
  }

  return itemsWithConfidence > 0 ? totalConfidence / itemsWithConfidence : 0;
}

module.exports = {
  transcribeAudio,
  synthesizeSpeech
};
