/**
 * Offline Message Queue Service for MedTranslate AI
 * 
 * This service provides persistent storage for WebSocket messages when offline
 * using IndexedDB in browser environments and AsyncStorage in React Native.
 */

// Detect environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// Import appropriate storage mechanism
let AsyncStorage;
if (isReactNative) {
  try {
    // Dynamic import for React Native
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (error) {
    console.error('Failed to import AsyncStorage:', error);
  }
}

// Constants
const DB_NAME = 'MedTranslateOfflineQueue';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const ASYNC_STORAGE_KEY = 'medtranslate_offline_queue';
const MAX_QUEUE_SIZE = 1000; // Maximum number of messages to store

class OfflineMessageQueue {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.pendingMessages = [];
    this.initPromise = null;
  }

  /**
   * Initialize the offline message queue
   * 
   * @returns {Promise<boolean>} - Initialization success
   */
  async init() {
    if (this.isInitialized) {
      return true;
    }

    // If initialization is already in progress, return the promise
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  /**
   * Internal initialization method
   * 
   * @private
   * @returns {Promise<boolean>} - Initialization success
   */
  async _initialize() {
    try {
      if (isReactNative) {
        // React Native implementation using AsyncStorage
        if (!AsyncStorage) {
          console.error('AsyncStorage is not available');
          return false;
        }

        // Load any existing messages from AsyncStorage
        const storedMessages = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (storedMessages) {
          try {
            this.pendingMessages = JSON.parse(storedMessages);
            console.log(`Loaded ${this.pendingMessages.length} offline messages from AsyncStorage`);
          } catch (error) {
            console.error('Error parsing stored messages:', error);
            this.pendingMessages = [];
          }
        }

        this.isInitialized = true;
        return true;
      } else {
        // Browser implementation using IndexedDB
        return new Promise((resolve, reject) => {
          if (!window.indexedDB) {
            console.error('IndexedDB is not supported in this browser');
            this.isInitialized = false;
            resolve(false);
            return;
          }

          const request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onerror = (event) => {
            console.error('Error opening IndexedDB:', event.target.error);
            this.isInitialized = false;
            resolve(false);
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create object store for messages
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
              store.createIndex('sessionId', 'sessionId', { unique: false });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('priority', 'priority', { unique: false });
            }
          };

          request.onsuccess = (event) => {
            this.db = event.target.result;
            this.isInitialized = true;
            
            // Load pending messages
            this._loadPendingMessages().then(() => {
              resolve(true);
            }).catch(error => {
              console.error('Error loading pending messages:', error);
              resolve(true); // Still consider initialization successful
            });
          };
        });
      }
    } catch (error) {
      console.error('Error initializing offline message queue:', error);
      this.isInitialized = false;
      return false;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Load pending messages from storage
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _loadPendingMessages() {
    if (isReactNative) {
      // Already loaded in init for React Native
      return;
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        this.pendingMessages = event.target.result;
        console.log(`Loaded ${this.pendingMessages.length} offline messages from IndexedDB`);
        resolve();
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Add a message to the offline queue
   * 
   * @param {Object} message - Message to queue
   * @param {string} sessionId - Session ID
   * @param {number} priority - Message priority (higher = more important)
   * @returns {Promise<boolean>} - Success indicator
   */
  async addMessage(message, sessionId, priority = 1) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      // Create message object
      const messageObject = {
        message: typeof message === 'string' ? message : JSON.stringify(message),
        sessionId,
        timestamp: Date.now(),
        priority,
        attempts: 0
      };

      if (isReactNative) {
        // React Native implementation
        this.pendingMessages.push(messageObject);
        
        // Enforce queue size limit
        if (this.pendingMessages.length > MAX_QUEUE_SIZE) {
          // Remove oldest, lowest priority messages first
          this.pendingMessages.sort((a, b) => {
            // Sort by priority (descending) and then by timestamp (ascending)
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
          });
          
          // Remove excess messages
          this.pendingMessages = this.pendingMessages.slice(0, MAX_QUEUE_SIZE);
        }
        
        // Save to AsyncStorage
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(this.pendingMessages));
        return true;
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          
          // Add the message
          const request = store.add(messageObject);
          
          request.onsuccess = () => {
            // Update in-memory cache
            this.pendingMessages.push(messageObject);
            
            // Check queue size
            this._enforceQueueSizeLimit().then(() => {
              resolve(true);
            }).catch(error => {
              console.error('Error enforcing queue size limit:', error);
              resolve(true); // Still consider the add successful
            });
          };
          
          request.onerror = (event) => {
            console.error('Error adding message to IndexedDB:', event.target.error);
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error adding message to offline queue:', error);
      return false;
    }
  }

  /**
   * Enforce queue size limit for IndexedDB
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _enforceQueueSizeLimit() {
    if (isReactNative) {
      return; // Handled in addMessage for React Native
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();
      
      countRequest.onsuccess = (event) => {
        const count = event.target.result;
        
        if (count <= MAX_QUEUE_SIZE) {
          resolve();
          return;
        }
        
        // Need to remove excess messages
        const excessCount = count - MAX_QUEUE_SIZE;
        
        // Get all messages sorted by priority and timestamp
        const getAllTransaction = this.db.transaction([STORE_NAME], 'readonly');
        const getAllStore = getAllTransaction.objectStore(STORE_NAME);
        const getAllRequest = getAllStore.getAll();
        
        getAllRequest.onsuccess = (event) => {
          const messages = event.target.result;
          
          // Sort by priority (descending) and then by timestamp (ascending)
          messages.sort((a, b) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
          });
          
          // Get IDs of messages to remove
          const messagesToRemove = messages.slice(MAX_QUEUE_SIZE).map(msg => msg.id);
          
          // Remove excess messages
          const deleteTransaction = this.db.transaction([STORE_NAME], 'readwrite');
          const deleteStore = deleteTransaction.objectStore(STORE_NAME);
          
          let deletedCount = 0;
          messagesToRemove.forEach(id => {
            const deleteRequest = deleteStore.delete(id);
            deleteRequest.onsuccess = () => {
              deletedCount++;
              if (deletedCount === messagesToRemove.length) {
                // Update in-memory cache
                this.pendingMessages = this.pendingMessages.filter(msg => !messagesToRemove.includes(msg.id));
                resolve();
              }
            };
          });
          
          deleteTransaction.onerror = (event) => {
            reject(event.target.error);
          };
        };
        
        getAllRequest.onerror = (event) => {
          reject(event.target.error);
        };
      };
      
      countRequest.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Get pending messages for a session
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} - Array of pending messages
   */
  async getMessages(sessionId) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      if (isReactNative) {
        // React Native implementation
        return this.pendingMessages
          .filter(msg => msg.sessionId === sessionId)
          .sort((a, b) => {
            // Sort by priority (descending) and then by timestamp (ascending)
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return a.timestamp - b.timestamp;
          });
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const index = store.index('sessionId');
          const request = index.getAll(sessionId);
          
          request.onsuccess = (event) => {
            const messages = event.target.result;
            
            // Sort by priority (descending) and then by timestamp (ascending)
            messages.sort((a, b) => {
              if (a.priority !== b.priority) {
                return b.priority - a.priority;
              }
              return a.timestamp - b.timestamp;
            });
            
            resolve(messages);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error getting messages from offline queue:', error);
      return [];
    }
  }

  /**
   * Remove a message from the queue
   * 
   * @param {string|number} messageId - Message ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async removeMessage(messageId) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      if (isReactNative) {
        // React Native implementation
        const index = this.pendingMessages.findIndex(msg => msg.id === messageId);
        if (index === -1) {
          return false;
        }
        
        this.pendingMessages.splice(index, 1);
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(this.pendingMessages));
        return true;
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(messageId);
          
          request.onsuccess = () => {
            // Update in-memory cache
            this.pendingMessages = this.pendingMessages.filter(msg => msg.id !== messageId);
            resolve(true);
          };
          
          request.onerror = (event) => {
            console.error('Error removing message from IndexedDB:', event.target.error);
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error removing message from offline queue:', error);
      return false;
    }
  }

  /**
   * Update message attempt count
   * 
   * @param {string|number} messageId - Message ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async incrementAttemptCount(messageId) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      if (isReactNative) {
        // React Native implementation
        const index = this.pendingMessages.findIndex(msg => msg.id === messageId);
        if (index === -1) {
          return false;
        }
        
        this.pendingMessages[index].attempts++;
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(this.pendingMessages));
        return true;
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const getRequest = store.get(messageId);
          
          getRequest.onsuccess = (event) => {
            const message = event.target.result;
            if (!message) {
              resolve(false);
              return;
            }
            
            message.attempts++;
            
            const updateRequest = store.put(message);
            
            updateRequest.onsuccess = () => {
              // Update in-memory cache
              const index = this.pendingMessages.findIndex(msg => msg.id === messageId);
              if (index !== -1) {
                this.pendingMessages[index].attempts = message.attempts;
              }
              resolve(true);
            };
            
            updateRequest.onerror = (event) => {
              console.error('Error updating message in IndexedDB:', event.target.error);
              reject(event.target.error);
            };
          };
          
          getRequest.onerror = (event) => {
            console.error('Error getting message from IndexedDB:', event.target.error);
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error incrementing message attempt count:', error);
      return false;
    }
  }

  /**
   * Clear all messages for a session
   * 
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async clearSession(sessionId) {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      if (isReactNative) {
        // React Native implementation
        this.pendingMessages = this.pendingMessages.filter(msg => msg.sessionId !== sessionId);
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(this.pendingMessages));
        return true;
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const index = store.index('sessionId');
          const request = index.getAll(sessionId);
          
          request.onsuccess = (event) => {
            const messages = event.target.result;
            
            if (messages.length === 0) {
              resolve(true);
              return;
            }
            
            const deleteTransaction = this.db.transaction([STORE_NAME], 'readwrite');
            const deleteStore = deleteTransaction.objectStore(STORE_NAME);
            
            let deletedCount = 0;
            messages.forEach(message => {
              const deleteRequest = deleteStore.delete(message.id);
              deleteRequest.onsuccess = () => {
                deletedCount++;
                if (deletedCount === messages.length) {
                  // Update in-memory cache
                  this.pendingMessages = this.pendingMessages.filter(msg => msg.sessionId !== sessionId);
                  resolve(true);
                }
              };
            });
            
            deleteTransaction.onerror = (event) => {
              reject(event.target.error);
            };
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error clearing session from offline queue:', error);
      return false;
    }
  }

  /**
   * Clear all messages
   * 
   * @returns {Promise<boolean>} - Success indicator
   */
  async clearAll() {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      if (isReactNative) {
        // React Native implementation
        this.pendingMessages = [];
        await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
        return true;
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.clear();
          
          request.onsuccess = () => {
            this.pendingMessages = [];
            resolve(true);
          };
          
          request.onerror = (event) => {
            console.error('Error clearing IndexedDB:', event.target.error);
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error clearing offline queue:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   * 
   * @returns {Promise<Object>} - Queue statistics
   */
  async getStats() {
    try {
      // Ensure initialization
      if (!this.isInitialized) {
        await this.init();
      }

      if (isReactNative) {
        // React Native implementation
        const sessionCounts = {};
        let totalSize = 0;
        
        this.pendingMessages.forEach(msg => {
          // Count by session
          sessionCounts[msg.sessionId] = (sessionCounts[msg.sessionId] || 0) + 1;
          
          // Calculate size
          totalSize += msg.message.length;
        });
        
        return {
          totalMessages: this.pendingMessages.length,
          sessionCounts,
          totalSize,
          oldestMessage: this.pendingMessages.length > 0 ? 
            Math.min(...this.pendingMessages.map(msg => msg.timestamp)) : null,
          newestMessage: this.pendingMessages.length > 0 ? 
            Math.max(...this.pendingMessages.map(msg => msg.timestamp)) : null
        };
      } else {
        // Browser implementation
        if (!this.db) {
          throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([STORE_NAME], 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const countRequest = store.count();
          
          countRequest.onsuccess = (event) => {
            const count = event.target.result;
            
            if (count === 0) {
              resolve({
                totalMessages: 0,
                sessionCounts: {},
                totalSize: 0,
                oldestMessage: null,
                newestMessage: null
              });
              return;
            }
            
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = (event) => {
              const messages = event.target.result;
              const sessionCounts = {};
              let totalSize = 0;
              
              messages.forEach(msg => {
                // Count by session
                sessionCounts[msg.sessionId] = (sessionCounts[msg.sessionId] || 0) + 1;
                
                // Calculate size
                totalSize += msg.message.length;
              });
              
              resolve({
                totalMessages: count,
                sessionCounts,
                totalSize,
                oldestMessage: Math.min(...messages.map(msg => msg.timestamp)),
                newestMessage: Math.max(...messages.map(msg => msg.timestamp))
              });
            };
            
            getAllRequest.onerror = (event) => {
              reject(event.target.error);
            };
          };
          
          countRequest.onerror = (event) => {
            reject(event.target.error);
          };
        });
      }
    } catch (error) {
      console.error('Error getting offline queue stats:', error);
      return {
        totalMessages: 0,
        sessionCounts: {},
        totalSize: 0,
        oldestMessage: null,
        newestMessage: null,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const offlineMessageQueue = new OfflineMessageQueue();

export default offlineMessageQueue;
