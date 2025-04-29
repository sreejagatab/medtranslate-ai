/**
 * Sync Manager for MedTranslate AI Edge Application
 *
 * This module manages synchronization between the edge device and the cloud,
 * including uploading cached translations, downloading model updates, and
 * synchronizing session data.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { cacheManager } = require('./cache');

// Configuration
const SYNC_DIR = process.env.SYNC_DIR || '../../sync';
const CONFIG_DIR = process.env.CONFIG_DIR || '../../config';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '300000', 10); // 5 minutes
const DEVICE_ID = process.env.DEVICE_ID || 'dev-edge-device';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Sync state
let syncInProgress = false;
let lastSyncTime = 0;
let lastSyncStatus = 'never';
let syncQueue = [];
let syncEnabled = true;

/**
 * Initialize the sync manager
 *
 * @returns {Promise<Object>} - Initialization result
 */
async function initialize() {
  try {
    console.log('Initializing sync manager...');

    // Create sync directory if it doesn't exist
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }

    // Create config directory if it doesn't exist
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Load sync configuration
    loadSyncConfig();

    // Start sync interval
    if (syncEnabled) {
      startSyncInterval();
    }

    console.log('Sync manager initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing sync manager:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load sync configuration from file
 */
function loadSyncConfig() {
  try {
    const configPath = path.join(CONFIG_DIR, 'sync-config.json');

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      syncEnabled = config.enabled !== false;
      lastSyncTime = config.lastSyncTime || 0;
      lastSyncStatus = config.lastSyncStatus || 'never';

      console.log(`Loaded sync configuration: enabled=${syncEnabled}, lastSync=${new Date(lastSyncTime).toISOString()}`);
    } else {
      // Create default configuration
      const defaultConfig = {
        enabled: true,
        lastSyncTime: 0,
        lastSyncStatus: 'never',
        deviceId: DEVICE_ID
      };

      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      console.log('Created default sync configuration');
    }
  } catch (error) {
    console.error('Error loading sync configuration:', error);
  }
}

/**
 * Save sync configuration to file
 */
function saveSyncConfig() {
  try {
    const configPath = path.join(CONFIG_DIR, 'sync-config.json');

    const config = {
      enabled: syncEnabled,
      lastSyncTime,
      lastSyncStatus,
      deviceId: DEVICE_ID
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving sync configuration:', error);
  }
}

/**
 * Start the sync interval
 */
function startSyncInterval() {
  console.log(`Starting sync interval (${SYNC_INTERVAL}ms)`);

  // Perform initial sync
  setTimeout(() => {
    syncWithCloud();
  }, 5000);

  // Set up interval
  setInterval(() => {
    if (syncEnabled && !syncInProgress) {
      syncWithCloud();
    }
  }, SYNC_INTERVAL);
}

/**
 * Queue a translation for sync
 *
 * @param {string} text - Original text
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {string} context - Medical context
 * @param {Object} result - Translation result
 */
function queueTranslation(text, sourceLanguage, targetLanguage, context, result) {
  try {
    // Create sync item
    const syncItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      timestamp: Date.now(),
      type: 'translation',
      data: {
        text,
        sourceLanguage,
        targetLanguage,
        context,
        result
      }
    };

    // Add to queue
    syncQueue.push(syncItem);

    // Save to file
    const syncFilePath = path.join(SYNC_DIR, `${syncItem.id}.json`);
    fs.writeFileSync(syncFilePath, JSON.stringify(syncItem, null, 2), 'utf8');

    console.log(`Queued translation for sync: ${syncItem.id}`);
  } catch (error) {
    console.error('Error queuing translation for sync:', error);
  }
}

/**
 * Sync with cloud
 *
 * @returns {Promise<Object>} - Sync result
 */
async function syncWithCloud() {
  if (syncInProgress) {
    console.log('Sync already in progress, skipping');
    return { success: false, reason: 'already_in_progress' };
  }

  syncInProgress = true;
  console.log('Starting sync with cloud...');

  try {
    // Load sync queue from files
    loadSyncQueue();

    // Test connection to cloud
    const connectionStatus = await testConnection();
    if (!connectionStatus.connected) {
      console.log('Cannot connect to cloud, skipping sync');
      syncInProgress = false;
      lastSyncStatus = 'failed';
      saveSyncConfig();
      return { success: false, reason: 'connection_failed' };
    }

    // Sync cached translations
    const translationResult = await syncCachedTranslations();

    // Sync model updates
    const modelResult = await syncModelUpdates();

    // Update sync status
    lastSyncTime = Date.now();
    lastSyncStatus = 'success';
    saveSyncConfig();

    syncInProgress = false;
    console.log('Sync completed successfully');

    return {
      success: true,
      translations: translationResult,
      models: modelResult
    };
  } catch (error) {
    console.error('Error syncing with cloud:', error);

    syncInProgress = false;
    lastSyncStatus = 'failed';
    saveSyncConfig();

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Load sync queue from files
 */
function loadSyncQueue() {
  try {
    // Clear queue
    syncQueue = [];

    // Read sync directory
    const files = fs.readdirSync(SYNC_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(SYNC_DIR, file));

    // Load sync items
    for (const file of files) {
      try {
        const syncItem = JSON.parse(fs.readFileSync(file, 'utf8'));
        syncQueue.push(syncItem);
      } catch (error) {
        console.error(`Error loading sync item from ${file}:`, error);
      }
    }

    console.log(`Loaded ${syncQueue.length} items from sync queue`);
  } catch (error) {
    console.error('Error loading sync queue:', error);
  }
}

/**
 * Sync cached translations
 *
 * @returns {Promise<Object>} - Sync result
 */
async function syncCachedTranslations() {
  try {
    console.log(`Syncing ${syncQueue.length} cached translations...`);

    // Group translations by batch
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < syncQueue.length; i += batchSize) {
      batches.push(syncQueue.slice(i, i + batchSize));
    }

    // Process batches
    let successCount = 0;
    let failureCount = 0;

    for (const batch of batches) {
      try {
        // Send batch to cloud
        const response = await axios.post(`${API_BASE_URL}/edge/sync`, {
          deviceId: DEVICE_ID,
          items: batch
        });

        if (response.data.success) {
          // Remove synced items from queue
          for (const item of batch) {
            const syncFilePath = path.join(SYNC_DIR, `${item.id}.json`);
            if (fs.existsSync(syncFilePath)) {
              fs.unlinkSync(syncFilePath);
            }
          }

          successCount += batch.length;
        } else {
          console.error('Error syncing batch:', response.data.error);
          failureCount += batch.length;
        }
      } catch (error) {
        console.error('Error syncing batch:', error);
        failureCount += batch.length;
      }
    }

    // Update sync queue
    loadSyncQueue();

    return {
      success: true,
      syncedCount: successCount,
      failedCount: failureCount,
      remainingCount: syncQueue.length
    };
  } catch (error) {
    console.error('Error syncing cached translations:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sync model updates
 *
 * @returns {Promise<Object>} - Sync result
 */
async function syncModelUpdates() {
  try {
    console.log('Checking for model updates...');

    // Get model manifest
    const response = await axios.get(`${API_BASE_URL}/edge/models/manifest`, {
      params: {
        deviceId: DEVICE_ID
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get model manifest');
    }

    const manifest = response.data.manifest;
    const modelUpdates = [];

    // Check for model updates
    for (const [modelKey, modelInfo] of Object.entries(manifest.models)) {
      const modelPath = path.join('../../models', modelInfo.filename);

      // Check if model exists
      if (!fs.existsSync(modelPath) || fs.statSync(modelPath).size !== modelInfo.size) {
        modelUpdates.push({
          key: modelKey,
          filename: modelInfo.filename,
          size: modelInfo.size
        });
      }
    }

    console.log(`Found ${modelUpdates.length} model updates`);

    // Download model updates
    let downloadedCount = 0;

    for (const model of modelUpdates) {
      try {
        console.log(`Downloading model: ${model.filename}`);

        // Download model
        const modelResponse = await axios.get(`${API_BASE_URL}/edge/models/${model.filename}`, {
          responseType: 'arraybuffer'
        });

        // Save model
        const modelPath = path.join('../../models', model.filename);
        fs.writeFileSync(modelPath, Buffer.from(modelResponse.data));

        downloadedCount++;
      } catch (error) {
        console.error(`Error downloading model ${model.filename}:`, error);
      }
    }

    // Save model manifest
    const manifestPath = path.join('../../models', 'model_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // Sync medical terminology
    const terminologyResult = await syncMedicalTerminology();

    return {
      success: true,
      updatesAvailable: modelUpdates.length,
      updatesDownloaded: downloadedCount,
      terminology: terminologyResult
    };
  } catch (error) {
    console.error('Error syncing model updates:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sync medical terminology
 *
 * @returns {Promise<Object>} - Sync result
 */
async function syncMedicalTerminology() {
  try {
    console.log('Syncing medical terminology...');

    // Get current terminology manifest
    const MODEL_DIR = process.env.MODEL_DIR || '../../models';
    const manifestPath = path.join(MODEL_DIR, 'manifest.json');

    let currentManifest = { models: [], lastSync: null };
    if (fs.existsSync(manifestPath)) {
      try {
        currentManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        console.error('Error parsing terminology manifest:', error);
      }
    }

    // Prepare request data
    const requestData = {
      deviceId: DEVICE_ID,
      lastSync: currentManifest.lastSync,
      currentModels: currentManifest.models ? currentManifest.models.map(model => ({
        id: model.id,
        version: model.version,
        termCount: model.term_count || 0
      })) : []
    };

    // Get terminology updates
    let response;
    try {
      if (process.env.NODE_ENV === 'development') {
        // Mock response for development
        console.log('[DEV] Using mock terminology response');
        response = {
          data: {
            success: true,
            updates: [
              {
                id: 'en-es',
                source_language: 'en',
                target_language: 'es',
                version: '1.0.0',
                terms: {
                  'heart attack': 'ataque cardíaco',
                  'blood pressure': 'presión arterial',
                  'diabetes': 'diabetes'
                }
              },
              {
                id: 'en-fr',
                source_language: 'en',
                target_language: 'fr',
                version: '1.0.0',
                terms: {
                  'heart attack': 'crise cardiaque',
                  'blood pressure': 'tension artérielle',
                  'diabetes': 'diabète'
                }
              }
            ],
            removals: []
          }
        };
      } else {
        response = await axios.post(`${API_BASE_URL}/edge/terminology/sync`, requestData);
      }
    } catch (error) {
      console.error('Error getting terminology updates:', error);
      return { success: false, error: error.message };
    }

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get terminology updates');
    }

    const { updates, removals } = response.data;

    // Process updates
    let updatedCount = 0;
    for (const update of updates) {
      const { id, source_language, target_language, version, terms } = update;

      // Create directory for language pair if it doesn't exist
      const dirPath = path.join(MODEL_DIR, id);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write terminology file
      const termsPath = path.join(dirPath, 'medical_terms.json');
      fs.writeFileSync(termsPath, JSON.stringify(terms, null, 2));

      // Write metadata file
      const metadataPath = path.join(dirPath, 'metadata.json');
      const metadata = {
        source_language,
        target_language,
        term_count: Object.keys(terms).length,
        created_at: new Date().toISOString(),
        version
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      updatedCount++;
    }

    // Process removals
    let removedCount = 0;
    for (const removal of removals) {
      const dirPath = path.join(MODEL_DIR, removal);
      if (fs.existsSync(dirPath)) {
        // Remove directory recursively
        fs.rmdirSync(dirPath, { recursive: true });
        removedCount++;
      }
    }

    // Update manifest
    const modelDirs = fs.readdirSync(MODEL_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.includes('-'))
      .map(dirent => dirent.name);

    const models = [];
    for (const dir of modelDirs) {
      const metadataPath = path.join(MODEL_DIR, dir, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          models.push({
            id: dir,
            source_language: metadata.source_language,
            target_language: metadata.target_language,
            term_count: metadata.term_count,
            version: metadata.version,
            created_at: metadata.created_at
          });
        } catch (error) {
          console.error(`Error parsing metadata for ${dir}:`, error);
        }
      }
    }

    const newManifest = {
      models,
      total_models: models.length,
      lastSync: new Date().toISOString(),
      version: '1.0.0'
    };

    fs.writeFileSync(manifestPath, JSON.stringify(newManifest, null, 2));

    console.log(`Terminology sync completed: ${updatedCount} updated, ${removedCount} removed`);

    return {
      success: true,
      updatedCount,
      removedCount,
      totalModels: models.length
    };
  } catch (error) {
    console.error('Error syncing medical terminology:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test connection to cloud
 *
 * @returns {Promise<Object>} - Connection status
 */
async function testConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    });

    return {
      connected: response.status === 200,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('Error testing connection:', error);
    return {
      connected: false,
      error: error.message
    };
  }
}

/**
 * Get sync status
 *
 * @returns {Object} - Sync status
 */
function getSyncStatus() {
  return {
    enabled: syncEnabled,
    inProgress: syncInProgress,
    lastSyncTime,
    lastSyncStatus,
    queueSize: syncQueue.length,
    deviceId: DEVICE_ID
  };
}

/**
 * Enable or disable sync
 *
 * @param {boolean} enabled - Whether sync is enabled
 */
function setSyncEnabled(enabled) {
  syncEnabled = enabled;
  saveSyncConfig();

  console.log(`Sync ${enabled ? 'enabled' : 'disabled'}`);
  return { success: true, enabled };
}

/**
 * Clear sync queue
 */
function clearSyncQueue() {
  try {
    // Read sync directory
    const files = fs.readdirSync(SYNC_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(SYNC_DIR, file));

    // Delete sync files
    for (const file of files) {
      fs.unlinkSync(file);
    }

    // Clear queue
    syncQueue = [];

    console.log(`Cleared sync queue (${files.length} items)`);
    return { success: true, clearedCount: files.length };
  } catch (error) {
    console.error('Error clearing sync queue:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initialize,
  queueTranslation,
  syncWithCloud,
  getSyncStatus,
  setSyncEnabled,
  clearSyncQueue,
  testConnection,
  syncMedicalTerminology
};
