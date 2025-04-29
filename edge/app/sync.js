/**
 * Cloud synchronization module for MedTranslate AI Edge Application
 *
 * This module provides functions for synchronizing data between the edge device
 * and the cloud, including translation results, model updates, and configuration.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { cacheManager } = require('./cache');

// Configuration
const SYNC_DIR = process.env.SYNC_DIR || '../../sync';
const MODEL_DIR = process.env.MODEL_DIR || '../../models';
const CONFIG_DIR = process.env.CONFIG_DIR || '../../config';
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://api.medtranslate.ai';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '300000'); // 5 minutes
const RETRY_INTERVAL = parseInt(process.env.RETRY_INTERVAL || '60000'); // 1 minute
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '5');
const DEVICE_ID = process.env.DEVICE_ID || `medtranslate-edge-${Math.random().toString(36).substring(2, 10)}`;
const QUEUE_FILE = path.join(__dirname, '../../sync/sync_queue.json');
const CONFLICT_DIR = path.join(__dirname, '../../sync/conflicts');
const MODEL_MANIFEST_FILE = path.join(__dirname, '../../models/model_manifest.json');

// Initialize sync queue and directories
let syncQueue = [];
let isInitialized = false;
let retryCount = 0;
let lastSyncTime = 0;

/**
 * Initialize the sync module
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing sync module...');

    // Create necessary directories
    for (const dir of [SYNC_DIR, CONFLICT_DIR, MODEL_DIR, CONFIG_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Load queue from disk if available
    if (fs.existsSync(QUEUE_FILE)) {
      try {
        syncQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
        console.log(`Loaded ${syncQueue.length} items from sync queue`);
      } catch (error) {
        console.error('Error parsing sync queue file:', error);
        syncQueue = [];
      }
    } else {
      console.log('No sync queue file found, starting with empty queue');
    }

    // Start periodic sync
    startPeriodicSync();

    isInitialized = true;
    console.log('Sync module initialized successfully');

    return {
      success: true,
      queueSize: syncQueue.length
    };
  } catch (error) {
    console.error('Error initializing sync module:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Start periodic synchronization
 */
function startPeriodicSync() {
  // Clear any existing interval
  if (global.syncInterval) {
    clearInterval(global.syncInterval);
  }

  // Set up new interval
  global.syncInterval = setInterval(async () => {
    try {
      // Check connection first
      const connectionStatus = await testConnection();

      if (connectionStatus.connected) {
        // Reset retry count on successful connection
        retryCount = 0;

        // Sync data and check for updates
        await syncCachedData();
        await checkForModelUpdates();

        // Update last sync time
        lastSyncTime = Date.now();
      } else {
        retryCount++;
        console.log(`Connection failed (retry ${retryCount}/${MAX_RETRIES}): ${connectionStatus.error}`);

        // If we've reached max retries, increase the interval
        if (retryCount >= MAX_RETRIES) {
          console.log('Max retries reached, increasing sync interval');
          clearInterval(global.syncInterval);
          global.syncInterval = setInterval(() => syncWithCloud(), SYNC_INTERVAL * 2);
        }
      }
    } catch (error) {
      console.error('Error during periodic sync:', error);
    }
  }, SYNC_INTERVAL);

  console.log(`Periodic sync started with interval of ${SYNC_INTERVAL}ms`);
}

/**
 * Tests the connection to the cloud API
 *
 * @returns {Promise<Object>} - Connection test result
 */
async function testConnection() {
  try {
    const response = await axios.get(`${CLOUD_API_URL}/health`, {
      timeout: 5000,
      headers: {
        'X-Device-ID': DEVICE_ID
      }
    });

    return {
      connected: response.status === 200,
      status: response.data.status,
      serverTime: response.headers['date']
    };
  } catch (error) {
    console.error('Cloud connection test failed:', error.message);
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Queues a translation for synchronization with the cloud
 *
 * @param {string} text - The original text
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {Object} result - The translation result
 */
function queueTranslation(text, sourceLanguage, targetLanguage, context, result) {
  // Ensure module is initialized
  if (!isInitialized) {
    initialize();
  }

  // Generate a unique ID for this translation
  const id = crypto.createHash('md5')
    .update(`${text}:${sourceLanguage}:${targetLanguage}:${context}:${Date.now()}`)
    .digest('hex');

  // Add to queue
  syncQueue.push({
    id,
    type: 'translation',
    data: {
      originalText: text,
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage,
      targetLanguage,
      context,
      isPivotTranslation: result.isPivotTranslation || false,
      pivotLanguage: result.pivotLanguage
    },
    deviceId: DEVICE_ID,
    timestamp: Date.now(),
    retries: 0
  });

  // Save queue to disk periodically
  if (syncQueue.length % 10 === 0) {
    saveQueueToDisk();
  }

  return id;
}

/**
 * Synchronizes cached data with the cloud
 *
 * @returns {Promise<Object>} - Sync result
 */
async function syncCachedData() {
  // Ensure module is initialized
  if (!isInitialized) {
    await initialize();
  }

  if (syncQueue.length === 0) {
    console.log('No items in sync queue');
    return { success: true, itemsSynced: 0 };
  }

  console.log(`Syncing ${syncQueue.length} items with cloud`);

  // Process queue in batches
  const batchSize = 10;
  const successfulItems = [];
  const failedItems = [];
  const conflictItems = [];

  for (let i = 0; i < syncQueue.length; i += batchSize) {
    const batch = syncQueue.slice(i, i + batchSize);

    try {
      // Send batch to cloud
      const response = await axios.post(`${CLOUD_API_URL}/sync`, {
        items: batch,
        deviceId: DEVICE_ID,
        timestamp: Date.now()
      }, {
        timeout: 10000,
        headers: {
          'X-Device-ID': DEVICE_ID,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        // Process response for each item
        const results = response.data.results || [];

        for (let j = 0; j < batch.length; j++) {
          const itemIndex = i + j;
          const item = batch[j];
          const result = results[j] || { status: 'unknown' };

          switch (result.status) {
            case 'success':
              successfulItems.push(itemIndex);
              break;

            case 'conflict':
              // Handle conflict
              conflictItems.push({ index: itemIndex, item, serverData: result.serverData });
              break;

            case 'error':
              // Increment retry count
              if (syncQueue[itemIndex]) {
                syncQueue[itemIndex].retries = (syncQueue[itemIndex].retries || 0) + 1;

                // If max retries reached, mark as failed
                if (syncQueue[itemIndex].retries >= MAX_RETRIES) {
                  failedItems.push(itemIndex);
                }
              }
              break;

            default:
              // Unknown status, retry later
              break;
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing batch ${i / batchSize + 1}:`, error.message);

      // Increment retry count for all items in the batch
      for (let j = 0; j < batch.length; j++) {
        const itemIndex = i + j;
        if (syncQueue[itemIndex]) {
          syncQueue[itemIndex].retries = (syncQueue[itemIndex].retries || 0) + 1;

          // If max retries reached, mark as failed
          if (syncQueue[itemIndex].retries >= MAX_RETRIES) {
            failedItems.push(itemIndex);
          }
        }
      }
    }
  }

  // Handle conflicts
  if (conflictItems.length > 0) {
    await handleConflicts(conflictItems);
  }

  // Remove successfully synced and failed items from queue
  const itemsToRemove = [...successfulItems, ...failedItems];
  if (itemsToRemove.length > 0) {
    // Save failed items to conflict directory
    for (const index of failedItems) {
      const item = syncQueue[index];
      if (item) {
        const failedFile = path.join(CONFLICT_DIR, `failed_${item.id}.json`);
        fs.writeFileSync(failedFile, JSON.stringify(item), 'utf8');
      }
    }

    // Remove items from queue
    syncQueue = syncQueue.filter((_, index) => !itemsToRemove.includes(index));
    console.log(`Removed ${successfulItems.length} successfully synced items and ${failedItems.length} failed items from queue`);
    saveQueueToDisk();
  }

  return {
    success: true,
    itemsSynced: successfulItems.length,
    itemsFailed: failedItems.length,
    itemsConflicted: conflictItems.length,
    itemsRemaining: syncQueue.length
  };
}

/**
 * Handle conflicts between local and server data
 *
 * @param {Array<Object>} conflicts - Conflict items
 */
async function handleConflicts(conflicts) {
  console.log(`Handling ${conflicts.length} conflicts`);

  for (const conflict of conflicts) {
    const { index, item, serverData } = conflict;

    // Save conflict to file for later analysis
    const conflictFile = path.join(CONFLICT_DIR, `conflict_${item.id}.json`);
    fs.writeFileSync(conflictFile, JSON.stringify({
      localData: item,
      serverData,
      timestamp: Date.now()
    }), 'utf8');

    // Simple conflict resolution strategy:
    // For translations, keep both versions if they're different
    if (item.type === 'translation') {
      // If server translation is different, add it to the cache
      if (serverData.translatedText !== item.data.translatedText) {
        cacheManager.cacheTranslation(
          item.data.originalText,
          item.data.sourceLanguage,
          item.data.targetLanguage,
          item.data.context,
          {
            translatedText: serverData.translatedText,
            confidence: serverData.confidence || 'medium'
          }
        );

        console.log(`Cached server translation for conflict ${item.id}`);
      }
    }
  }
}

/**
 * Checks for and downloads model updates from the cloud
 *
 * @returns {Promise<Object>} - Update result
 */
async function checkForModelUpdates() {
  try {
    // Ensure module is initialized
    if (!isInitialized) {
      await initialize();
    }

    // Load model manifest
    let manifest = { models: {}, lastSync: 0 };
    if (fs.existsSync(MODEL_MANIFEST_FILE)) {
      try {
        manifest = JSON.parse(fs.readFileSync(MODEL_MANIFEST_FILE, 'utf8'));
      } catch (error) {
        console.error('Error parsing model manifest:', error);
      }
    }

    // Get current model versions
    const currentVersions = getCurrentModelVersions();

    // Request updates from server
    const response = await axios.get(`${CLOUD_API_URL}/models/updates`, {
      params: {
        deviceId: DEVICE_ID,
        lastSync: manifest.lastSync || 0,
        currentVersions
      },
      timeout: 30000,
      headers: {
        'X-Device-ID': DEVICE_ID
      }
    });

    if (response.status === 200) {
      const updateData = response.data;

      if (updateData.updates && updateData.updates.length > 0) {
        const updates = updateData.updates;
        console.log(`Found ${updates.length} model updates available`);

        // Download updates
        const downloadResults = [];
        for (const update of updates) {
          const result = await downloadModelUpdate(update);
          downloadResults.push({
            model: update.filename,
            success: result
          });
        }

        // Update manifest
        manifest.lastSync = Date.now();
        manifest.models = { ...manifest.models, ...currentVersions };
        fs.writeFileSync(MODEL_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

        return {
          success: true,
          updatesAvailable: updates.length,
          updatesDownloaded: downloadResults.filter(r => r.success).length,
          results: downloadResults
        };
      } else {
        console.log('No model updates available');

        // Update last sync time in manifest
        manifest.lastSync = Date.now();
        fs.writeFileSync(MODEL_MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

        return {
          success: true,
          updatesAvailable: 0
        };
      }
    } else {
      console.error('Error response from update server:', response.status);
      return {
        success: false,
        error: `Server returned status ${response.status}`
      };
    }
  } catch (error) {
    console.error('Error checking for model updates:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Downloads a model update from the cloud
 *
 * @param {Object} update - The model update information
 * @returns {Promise<boolean>} - Success indicator
 */
async function downloadModelUpdate(update) {
  const modelPath = path.join(MODEL_DIR, update.filename);
  const tempPath = `${modelPath}.download`;

  try {
    console.log(`Downloading model update: ${update.filename} (${update.size} bytes)`);

    // Create a temporary file for downloading
    const writer = fs.createWriteStream(tempPath);

    // Download model file
    const response = await axios({
      method: 'get',
      url: update.downloadUrl,
      responseType: 'stream',
      timeout: 300000, // 5 minutes
      headers: {
        'X-Device-ID': DEVICE_ID
      }
    });

    // Pipe the response to the file
    response.data.pipe(writer);

    // Wait for download to complete
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Verify download size
    const stats = fs.statSync(tempPath);
    if (stats.size !== update.size) {
      throw new Error(`Size mismatch: expected ${update.size}, got ${stats.size}`);
    }

    // Verify checksum if provided
    if (update.md5) {
      const fileHash = await calculateFileHash(tempPath);
      if (fileHash !== update.md5) {
        throw new Error(`Checksum mismatch: expected ${update.md5}, got ${fileHash}`);
      }
    }

    // Rename temporary file to final filename
    fs.renameSync(tempPath, modelPath);

    console.log(`Successfully downloaded and verified model update: ${update.filename}`);
    return true;
  } catch (error) {
    console.error(`Error downloading model update ${update.filename}:`, error.message);

    // Clean up temporary file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    return false;
  }
}

/**
 * Calculate MD5 hash of a file
 *
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - MD5 hash
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);

    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', error => reject(error));
  });
}

/**
 * Gets the current versions of all local models
 *
 * @returns {Object} - Map of model names to version information
 */
function getCurrentModelVersions() {
  const versions = {};

  try {
    if (!fs.existsSync(MODEL_DIR)) {
      return versions;
    }

    const files = fs.readdirSync(MODEL_DIR);

    for (const file of files) {
      if (file.endsWith('.bin')) {
        const stats = fs.statSync(path.join(MODEL_DIR, file));
        versions[file] = {
          filename: file,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      }
    }
  } catch (error) {
    console.error('Error getting current model versions:', error);
  }

  return versions;
}

/**
 * Saves the sync queue to disk
 */
function saveQueueToDisk() {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(syncQueue), 'utf8');
    console.log(`Saved ${syncQueue.length} items to sync queue`);
  } catch (error) {
    console.error('Error saving sync queue to disk:', error);
  }
}

/**
 * Get sync status information
 *
 * @returns {Object} - Sync status
 */
function getSyncStatus() {
  return {
    initialized: isInitialized,
    queueSize: syncQueue.length,
    lastSyncTime,
    retryCount,
    deviceId: DEVICE_ID
  };
}

/**
 * Queues an audio translation for synchronization with the cloud
 *
 * @param {string} audioHash - Hash of the audio data
 * @param {string} sourceLanguage - The source language code
 * @param {string} targetLanguage - The target language code
 * @param {string} context - The medical context
 * @param {Object} result - The translation result
 * @returns {string} - The ID of the queued item
 */
function queueAudioTranslation(audioHash, sourceLanguage, targetLanguage, context, result) {
  // Ensure module is initialized
  if (!isInitialized) {
    initialize();
  }

  // Generate a unique ID for this translation
  const id = crypto.createHash('md5')
    .update(`audio:${audioHash}:${sourceLanguage}:${targetLanguage}:${context}:${Date.now()}`)
    .digest('hex');

  // Add to queue
  syncQueue.push({
    id,
    type: 'audio_translation',
    data: {
      audioHash,
      originalText: result.originalText,
      translatedText: result.translatedText,
      confidence: result.confidence,
      sourceLanguage,
      targetLanguage,
      context,
      processingTime: result.processingTime
    },
    deviceId: DEVICE_ID,
    timestamp: Date.now(),
    retries: 0
  });

  // Save queue to disk periodically
  if (syncQueue.length % 10 === 0) {
    saveQueueToDisk();
  }

  return id;
}

// Export sync functions
const syncWithCloud = {
  initialize,
  testConnection,
  queueTranslation,
  queueAudioTranslation,
  syncCachedData,
  checkForModelUpdates,
  getSyncStatus
};

// Save queue to disk on process exit
process.on('exit', () => {
  saveQueueToDisk();
});

// Clean up interval on process exit
process.on('SIGTERM', () => {
  if (global.syncInterval) {
    clearInterval(global.syncInterval);
  }
});

module.exports = { syncWithCloud };
