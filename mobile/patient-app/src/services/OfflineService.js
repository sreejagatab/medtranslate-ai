/**
 * Offline Service for MedTranslate AI Patient App
 * 
 * This service handles offline translation functionality, including:
 * - Storing translations performed offline
 * - Synchronizing offline translations with the server
 * - Managing the offline translation queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_URL } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all offline queue items
 * 
 * @returns {Promise<Array>} Array of queue items
 */
export async function getQueueItems() {
  try {
    const queueString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return queueString ? JSON.parse(queueString) : [];
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
}

/**
 * Add a translation to the offline queue
 * 
 * @param {Object} translation Translation data
 * @returns {Promise<Object>} Added queue item
 */
export async function addToQueue(translation) {
  try {
    // Get current queue
    const queue = await getQueueItems();
    
    // Create queue item
    const queueItem = {
      id: uuidv4(),
      timestamp: Date.now(),
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      sourceText: translation.sourceText,
      translatedText: translation.translatedText,
      medicalContext: translation.medicalContext || 'general',
      audioUrl: translation.audioUrl,
      status: 'pending',
      retries: 0,
      lastRetry: null
    };
    
    // Add to queue
    const updatedQueue = [queueItem, ...queue];
    
    // Save updated queue
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
    
    return queueItem;
  } catch (error) {
    console.error('Error adding to offline queue:', error);
    throw new Error('Failed to add translation to offline queue');
  }
}

/**
 * Remove an item from the offline queue
 * 
 * @param {string} itemId Queue item ID
 * @returns {Promise<boolean>} Success status
 */
export async function removeQueueItem(itemId) {
  try {
    // Get current queue
    const queue = await getQueueItems();
    
    // Remove item
    const updatedQueue = queue.filter(item => item.id !== itemId);
    
    // Save updated queue
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
    
    return true;
  } catch (error) {
    console.error('Error removing from offline queue:', error);
    throw new Error('Failed to remove translation from offline queue');
  }
}

/**
 * Clear the offline queue
 * 
 * @returns {Promise<boolean>} Success status
 */
export async function clearQueue() {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing offline queue:', error);
    throw new Error('Failed to clear offline queue');
  }
}

/**
 * Sync a specific queue item with the server
 * 
 * @param {string} itemId Queue item ID
 * @returns {Promise<boolean>} Success status
 */
export async function syncItem(itemId) {
  try {
    // Get current queue
    const queue = await getQueueItems();
    
    // Find item
    const itemIndex = queue.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Queue item not found');
    }
    
    const item = queue[itemIndex];
    
    // Update item status
    const updatedItem = {
      ...item,
      status: 'syncing',
      retries: item.retries + 1,
      lastRetry: Date.now()
    };
    
    // Update queue
    const updatedQueue = [...queue];
    updatedQueue[itemIndex] = updatedItem;
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
    
    // Send to server
    const response = await fetch(`${API_URL}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceLanguage: item.sourceLanguage,
        targetLanguage: item.targetLanguage,
        text: item.sourceText,
        medicalContext: item.medicalContext,
        offlineId: item.id
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    // Remove from queue on success
    await removeQueueItem(itemId);
    
    return true;
  } catch (error) {
    console.error('Error syncing queue item:', error);
    
    // Update item status to failed
    try {
      const queue = await getQueueItems();
      const itemIndex = queue.findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        const item = queue[itemIndex];
        const updatedItem = {
          ...item,
          status: 'failed',
          lastRetry: Date.now()
        };
        
        const updatedQueue = [...queue];
        updatedQueue[itemIndex] = updatedItem;
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
      }
    } catch (updateError) {
      console.error('Error updating queue item status:', updateError);
    }
    
    throw new Error('Failed to sync translation with server');
  }
}

/**
 * Sync all queue items with the server
 * 
 * @returns {Promise<Object>} Sync results
 */
export async function syncAllItems() {
  try {
    // Get current queue
    const queue = await getQueueItems();
    
    if (queue.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }
    
    // Track results
    const results = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };
    
    // Sync each item
    for (const item of queue) {
      try {
        await syncItem(item.id);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          itemId: item.id,
          error: error.message
        });
      }
    }
    
    // Update success flag
    results.success = results.failed === 0;
    
    return results;
  } catch (error) {
    console.error('Error syncing all queue items:', error);
    throw new Error('Failed to sync translations with server');
  }
}

/**
 * Perform an offline translation
 * 
 * @param {Object} translationRequest Translation request
 * @returns {Promise<Object>} Translation result
 */
export async function performOfflineTranslation(translationRequest) {
  try {
    // Get offline translation model
    const offlineModel = await getOfflineModel(
      translationRequest.sourceLanguage,
      translationRequest.targetLanguage
    );
    
    if (!offlineModel) {
      throw new Error('No offline translation model available');
    }
    
    // Perform translation using offline model
    // This is a placeholder - in a real app, you would use a local ML model
    const translatedText = `[OFFLINE] ${translationRequest.text}`;
    
    // Create translation result
    const translationResult = {
      sourceLanguage: translationRequest.sourceLanguage,
      targetLanguage: translationRequest.targetLanguage,
      sourceText: translationRequest.text,
      translatedText,
      medicalContext: translationRequest.medicalContext || 'general',
      confidence: 'medium',
      modelUsed: 'offline',
      timestamp: Date.now()
    };
    
    // Add to queue for later synchronization
    await addToQueue(translationResult);
    
    return translationResult;
  } catch (error) {
    console.error('Error performing offline translation:', error);
    throw new Error('Failed to perform offline translation');
  }
}

/**
 * Get offline translation model
 * 
 * @param {string} sourceLanguage Source language
 * @param {string} targetLanguage Target language
 * @returns {Promise<Object|null>} Offline model or null if not available
 */
async function getOfflineModel(sourceLanguage, targetLanguage) {
  try {
    // Get available offline models
    const modelsString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODELS);
    const models = modelsString ? JSON.parse(modelsString) : [];
    
    // Find model for language pair
    return models.find(
      model => 
        model.sourceLanguage === sourceLanguage && 
        model.targetLanguage === targetLanguage
    ) || null;
  } catch (error) {
    console.error('Error getting offline model:', error);
    return null;
  }
}

/**
 * Check if offline translation is available for a language pair
 * 
 * @param {string} sourceLanguage Source language
 * @param {string} targetLanguage Target language
 * @returns {Promise<boolean>} Whether offline translation is available
 */
export async function isOfflineTranslationAvailable(sourceLanguage, targetLanguage) {
  try {
    const model = await getOfflineModel(sourceLanguage, targetLanguage);
    return !!model;
  } catch (error) {
    console.error('Error checking offline translation availability:', error);
    return false;
  }
}

/**
 * Get offline translation statistics
 * 
 * @returns {Promise<Object>} Statistics
 */
export async function getOfflineStats() {
  try {
    // Get queue
    const queue = await getQueueItems();
    
    // Get models
    const modelsString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODELS);
    const models = modelsString ? JSON.parse(modelsString) : [];
    
    // Calculate stats
    return {
      queueSize: queue.length,
      pendingItems: queue.filter(item => item.status === 'pending').length,
      failedItems: queue.filter(item => item.status === 'failed').length,
      availableModels: models.length,
      totalStorageUsed: await calculateStorageUsed()
    };
  } catch (error) {
    console.error('Error getting offline stats:', error);
    return {
      queueSize: 0,
      pendingItems: 0,
      failedItems: 0,
      availableModels: 0,
      totalStorageUsed: 0
    };
  }
}

/**
 * Calculate storage used by offline data
 * 
 * @returns {Promise<number>} Storage used in bytes
 */
async function calculateStorageUsed() {
  try {
    // Get queue
    const queueString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    const queueSize = queueString ? queueString.length : 0;
    
    // Get models
    const modelsString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODELS);
    const modelsSize = modelsString ? modelsString.length : 0;
    
    // Calculate total
    return queueSize + modelsSize;
  } catch (error) {
    console.error('Error calculating storage used:', error);
    return 0;
  }
}

export default {
  getQueueItems,
  addToQueue,
  removeQueueItem,
  clearQueue,
  syncItem,
  syncAllItems,
  performOfflineTranslation,
  isOfflineTranslationAvailable,
  getOfflineStats
};
