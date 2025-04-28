/**
 * Secure Storage Service for MedTranslate AI
 * 
 * This module provides functions for secure, HIPAA-compliant storage
 * of sensitive medical data with encryption and retention policies.
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize AWS services
const s3 = new AWS.S3();
const kms = new AWS.KMS();

// Constants
const RETENTION_PERIOD_DAYS = parseInt(process.env.RETENTION_PERIOD_DAYS || '30');

/**
 * Generate a data encryption key (DEK) using AWS KMS
 * 
 * @returns {Promise<Object>} - Data encryption key
 */
async function generateDataKey() {
  try {
    const result = await kms.generateDataKey({
      KeyId: process.env.KMS_KEY_ID || 'alias/MedTranslateKey',
      KeySpec: 'AES_256'
    }).promise();
    
    return {
      plaintextKey: result.Plaintext,
      encryptedKey: result.CiphertextBlob
    };
  } catch (error) {
    console.error('Error generating data key:', error);
    throw new Error('Encryption key generation failed');
  }
}

/**
 * Encrypt data using the data encryption key
 * 
 * @param {string} data - Data to encrypt
 * @param {Buffer} key - Encryption key
 * @returns {Object} - Encrypted data with IV
 */
function encryptData(data, key) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      iv: iv.toString('base64'),
      encryptedData: encrypted
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Data encryption failed');
  }
}

/**
 * Store encrypted data in S3
 * 
 * @param {string} sessionId - Session ID
 * @param {string} dataType - Type of data (e.g., 'conversation', 'summary')
 * @param {string} data - Data to store
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Storage result
 */
async function storeEncryptedData(sessionId, dataType, data, metadata = {}) {
  try {
    // Generate a data key for this file
    const { plaintextKey, encryptedKey } = await generateDataKey();
    
    // Encrypt the data
    const { iv, encryptedData } = encryptData(data, plaintextKey);
    
    // Create the encryption envelope
    const encryptionEnvelope = {
      encryptedData,
      iv,
      encryptedKey: encryptedKey.toString('base64')
    };
    
    // Generate a unique key for this data
    const objectKey = `sessions/${sessionId}/${dataType}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Calculate expiration date based on retention period
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + RETENTION_PERIOD_DAYS);
    
    // Store in S3 with metadata
    await s3.putObject({
      Bucket: process.env.SECURE_STORAGE_BUCKET || 'medtranslate-secure-storage',
      Key: objectKey,
      Body: JSON.stringify(encryptionEnvelope),
      Metadata: {
        'session-id': sessionId,
        'data-type': dataType,
        'encrypted': 'true',
        'expiration-date': expirationDate.toISOString(),
        ...metadata
      },
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256' // Additional S3 server-side encryption
    }).promise();
    
    return { 
      success: true,
      objectKey,
      expirationDate: expirationDate.toISOString()
    };
  } catch (error) {
    console.error('Error storing encrypted data:', error);
    throw new Error('Secure storage failed');
  }
}

/**
 * Retrieve and decrypt data from S3
 * 
 * @param {string} objectKey - S3 object key
 * @returns {Promise<Object>} - Decrypted data and metadata
 */
async function retrieveEncryptedData(objectKey) {
  try {
    // Get the encrypted object from S3
    const result = await s3.getObject({
      Bucket: process.env.SECURE_STORAGE_BUCKET || 'medtranslate-secure-storage',
      Key: objectKey
    }).promise();
    
    const encryptionEnvelope = JSON.parse(result.Body.toString());
    
    // Decrypt the data key using KMS
    const decryptResult = await kms.decrypt({
      CiphertextBlob: Buffer.from(encryptionEnvelope.encryptedKey, 'base64'),
      KeyId: process.env.KMS_KEY_ID || 'alias/MedTranslateKey'
    }).promise();
    
    const plaintextKey = decryptResult.Plaintext;
    
    // Decrypt the data
    const iv = Buffer.from(encryptionEnvelope.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', plaintextKey, iv);
    
    let decrypted = decipher.update(encryptionEnvelope.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return {
      data: decrypted,
      metadata: result.Metadata
    };
  } catch (error) {
    console.error('Error retrieving encrypted data:', error);
    throw new Error('Data retrieval failed');
  }
}

/**
 * Store a conversation transcript securely
 * 
 * @param {string} sessionId - Session ID
 * @param {Array} messages - Conversation messages
 * @param {Object} sessionInfo - Session information
 * @returns {Promise<Object>} - Storage result
 */
async function storeConversationTranscript(sessionId, messages, sessionInfo) {
  try {
    // Sanitize messages to remove sensitive data
    const sanitizedMessages = messages.map(msg => ({
      id: msg.id,
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp,
      confidence: msg.confidence
    }));
    
    // Create transcript data
    const transcriptData = {
      sessionId,
      providerName: sessionInfo.providerName,
      medicalContext: sessionInfo.medicalContext,
      patientLanguage: sessionInfo.patientLanguage,
      startTime: sessionInfo.startTime,
      endTime: sessionInfo.endTime || new Date().toISOString(),
      messages: sanitizedMessages
    };
    
    // Store encrypted transcript
    return await storeEncryptedData(
      sessionId,
      'transcript',
      JSON.stringify(transcriptData),
      {
        'provider-id': sessionInfo.providerId,
        'patient-language': sessionInfo.patientLanguage,
        'medical-context': sessionInfo.medicalContext
      }
    );
  } catch (error) {
    console.error('Error storing conversation transcript:', error);
    throw new Error('Failed to store conversation transcript');
  }
}

/**
 * Delete data based on retention policy
 * 
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteExpiredData() {
  const now = new Date().toISOString();
  
  try {
    // List objects in the bucket
    const listParams = {
      Bucket: process.env.SECURE_STORAGE_BUCKET || 'medtranslate-secure-storage',
      Prefix: 'sessions/'
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (listedObjects.Contents.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    
    // Find objects that have expired
    const objectsToDelete = [];
    
    for (const object of listedObjects.Contents) {
      const metadata = await s3.headObject({
        Bucket: process.env.SECURE_STORAGE_BUCKET || 'medtranslate-secure-storage',
        Key: object.Key
      }).promise();
      
      if (metadata.Metadata['expiration-date'] && metadata.Metadata['expiration-date'] < now) {
        objectsToDelete.push({ Key: object.Key });
      }
    }
    
    // Delete expired objects
    if (objectsToDelete.length > 0) {
      await s3.deleteObjects({
        Bucket: process.env.SECURE_STORAGE_BUCKET || 'medtranslate-secure-storage',
        Delete: { Objects: objectsToDelete }
      }).promise();
      
      console.log(`Deleted ${objectsToDelete.length} expired objects`);
      return { success: true, deletedCount: objectsToDelete.length };
    }
    
    return { success: true, deletedCount: 0 };
  } catch (error) {
    console.error('Error in retention cleanup:', error);
    throw new Error('Retention cleanup failed');
  }
}

/**
 * Get session data with access control
 * 
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID requesting access
 * @param {string} userType - User type ('provider' or 'patient')
 * @returns {Promise<Object>} - Session data
 */
async function getSessionData(sessionId, userId, userType) {
  try {
    // List objects for this session
    const listParams = {
      Bucket: process.env.SECURE_STORAGE_BUCKET || 'medtranslate-secure-storage',
      Prefix: `sessions/${sessionId}/`
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (listedObjects.Contents.length === 0) {
      return { success: false, error: 'Session data not found' };
    }
    
    // Get the latest transcript
    const transcriptObjects = listedObjects.Contents
      .filter(obj => obj.Key.includes('/transcript/'))
      .sort((a, b) => b.LastModified - a.LastModified);
    
    if (transcriptObjects.length === 0) {
      return { success: false, error: 'Session transcript not found' };
    }
    
    // Get the transcript
    const transcriptData = await retrieveEncryptedData(transcriptObjects[0].Key);
    const transcript = JSON.parse(transcriptData.data);
    
    // Check access permissions
    if (userType === 'provider' && transcriptData.metadata['provider-id'] !== userId) {
      return { success: false, error: 'Access denied' };
    }
    
    return {
      success: true,
      sessionData: {
        sessionId,
        providerName: transcript.providerName,
        medicalContext: transcript.medicalContext,
        patientLanguage: transcript.patientLanguage,
        startTime: transcript.startTime,
        endTime: transcript.endTime,
        messages: transcript.messages
      }
    };
  } catch (error) {
    console.error('Error retrieving session data:', error);
    throw new Error('Failed to retrieve session data');
  }
}

module.exports = {
  storeEncryptedData,
  retrieveEncryptedData,
  storeConversationTranscript,
  deleteExpiredData,
  getSessionData
};
