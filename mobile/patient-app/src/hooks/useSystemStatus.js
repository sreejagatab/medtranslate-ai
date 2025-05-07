/**
 * useSystemStatus Hook for MedTranslate AI Mobile App
 * 
 * This hook provides access to system status information and control functions
 * for the ML models, predictive caching system, auto-sync-manager, and storage-optimizer.
 * It integrates with the backend services to provide a unified interface for
 * accessing and controlling these components.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config';
import { useWebSocket } from './useWebSocket';

/**
 * useSystemStatus hook
 * 
 * @returns {Object} System status and control functions
 */
export const useSystemStatus = () => {
  // State for system status
  const [cacheStats, setCacheStats] = useState({});
  const [offlineReadiness, setOfflineReadiness] = useState(0);
  const [offlineRisk, setOfflineRisk] = useState(0);
  const [mlPredictions, setMlPredictions] = useState({});
  const [mlPerformance, setMlPerformance] = useState({});
  const [mlPerformanceHistory, setMlPerformanceHistory] = useState([]);
  const [storageInfo, setStorageInfo] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [syncHistory, setSyncHistory] = useState([]);
  const [devicePerformance, setDevicePerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket();

  // API endpoints
  const CACHE_STATS_ENDPOINT = `${API_BASE_URL}/api/cache/stats`;
  const ML_PERFORMANCE_ENDPOINT = `${API_BASE_URL}/api/ml/performance`;
  const ML_PERFORMANCE_HISTORY_ENDPOINT = `${API_BASE_URL}/api/ml/performance/history`;
  const STORAGE_INFO_ENDPOINT = `${API_BASE_URL}/api/storage/info`;
  const SYNC_STATUS_ENDPOINT = `${API_BASE_URL}/api/sync/status`;
  const SYNC_HISTORY_ENDPOINT = `${API_BASE_URL}/api/sync/history`;
  const DEVICE_PERFORMANCE_ENDPOINT = `${API_BASE_URL}/api/device/performance`;

  // Fetch cache stats
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch(CACHE_STATS_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setCacheStats(data);
      
      // Extract offline readiness and risk from cache stats
      if (data.offlineReadiness !== undefined) {
        setOfflineReadiness(data.offlineReadiness);
      }
      
      if (data.offlineRisk !== undefined) {
        setOfflineRisk(data.offlineRisk);
      }
      
      if (data.mlPredictions !== undefined) {
        setMlPredictions(data.mlPredictions);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      setError('Failed to fetch cache statistics');
    }
  }, [CACHE_STATS_ENDPOINT]);

  // Fetch ML performance
  const fetchMlPerformance = useCallback(async () => {
    try {
      const response = await fetch(ML_PERFORMANCE_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setMlPerformance(data);
    } catch (error) {
      console.error('Error fetching ML performance:', error);
      setError('Failed to fetch ML performance');
    }
  }, [ML_PERFORMANCE_ENDPOINT]);

  // Fetch ML performance history
  const fetchMlPerformanceHistory = useCallback(async () => {
    try {
      const response = await fetch(ML_PERFORMANCE_HISTORY_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setMlPerformanceHistory(data);
    } catch (error) {
      console.error('Error fetching ML performance history:', error);
      setError('Failed to fetch ML performance history');
    }
  }, [ML_PERFORMANCE_HISTORY_ENDPOINT]);

  // Fetch storage info
  const fetchStorageInfo = useCallback(async () => {
    try {
      const response = await fetch(STORAGE_INFO_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setStorageInfo(data);
    } catch (error) {
      console.error('Error fetching storage info:', error);
      setError('Failed to fetch storage information');
    }
  }, [STORAGE_INFO_ENDPOINT]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch(SYNC_STATUS_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSyncStatus(data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setError('Failed to fetch sync status');
    }
  }, [SYNC_STATUS_ENDPOINT]);

  // Fetch sync history
  const fetchSyncHistory = useCallback(async () => {
    try {
      const response = await fetch(SYNC_HISTORY_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSyncHistory(data);
    } catch (error) {
      console.error('Error fetching sync history:', error);
      setError('Failed to fetch sync history');
    }
  }, [SYNC_HISTORY_ENDPOINT]);

  // Fetch device performance
  const fetchDevicePerformance = useCallback(async () => {
    try {
      const response = await fetch(DEVICE_PERFORMANCE_ENDPOINT);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setDevicePerformance(data);
    } catch (error) {
      console.error('Error fetching device performance:', error);
      setError('Failed to fetch device performance');
    }
  }, [DEVICE_PERFORMANCE_ENDPOINT]);

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCacheStats(),
        fetchMlPerformance(),
        fetchMlPerformanceHistory(),
        fetchStorageInfo(),
        fetchSyncStatus(),
        fetchSyncHistory(),
        fetchDevicePerformance()
      ]);
    } catch (error) {
      console.error('Error fetching system status:', error);
      setError('Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  }, [
    fetchCacheStats,
    fetchMlPerformance,
    fetchMlPerformanceHistory,
    fetchStorageInfo,
    fetchSyncStatus,
    fetchSyncHistory,
    fetchDevicePerformance
  ]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Set up automatic refresh
  useEffect(() => {
    if (refreshInterval) {
      const intervalId = setInterval(fetchAllData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, fetchAllData]);

  // Update data when WebSocket message is received
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        if (data.type === 'system_status_update') {
          // Update system status
          if (data.cacheStats) setCacheStats(data.cacheStats);
          if (data.offlineReadiness !== undefined) setOfflineReadiness(data.offlineReadiness);
          if (data.offlineRisk !== undefined) setOfflineRisk(data.offlineRisk);
          if (data.mlPredictions) setMlPredictions(data.mlPredictions);
          if (data.mlPerformance) setMlPerformance(data.mlPerformance);
          if (data.storageInfo) setStorageInfo(data.storageInfo);
          if (data.syncStatus) setSyncStatus(data.syncStatus);
          if (data.devicePerformance) setDevicePerformance(data.devicePerformance);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  // Control functions
  const manualSync = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/manual`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await Promise.all([fetchSyncStatus(), fetchSyncHistory()]);
      return await response.json();
    } catch (error) {
      console.error('Error performing manual sync:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchSyncStatus, fetchSyncHistory]);

  const toggleAutoSync = useCallback(async (enabled) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await fetchSyncStatus();
      return await response.json();
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchSyncStatus]);

  const prepareForOffline = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offline/prepare`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await Promise.all([fetchCacheStats(), fetchSyncStatus()]);
      return await response.json();
    } catch (error) {
      console.error('Error preparing for offline:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchCacheStats, fetchSyncStatus]);

  const optimizeStorage = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/storage/optimize`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await fetchStorageInfo();
      return await response.json();
    } catch (error) {
      console.error('Error optimizing storage:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchStorageInfo]);

  const clearCache = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/clear`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await fetchCacheStats();
      return await response.json();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchCacheStats]);

  const refreshCache = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cache/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await fetchCacheStats();
      return await response.json();
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchCacheStats]);

  const trainModels = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/train`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await Promise.all([fetchMlPerformance(), fetchMlPerformanceHistory()]);
      return await response.json();
    } catch (error) {
      console.error('Error training models:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchMlPerformance, fetchMlPerformanceHistory]);

  const configureModels = useCallback(async (config) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      await fetchMlPerformance();
      return await response.json();
    } catch (error) {
      console.error('Error configuring models:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchMlPerformance]);

  return {
    // State
    cacheStats,
    offlineReadiness,
    offlineRisk,
    mlPredictions,
    mlPerformance,
    mlPerformanceHistory,
    storageInfo,
    syncStatus,
    syncHistory,
    devicePerformance,
    loading,
    error,
    
    // Control functions
    setRefreshInterval,
    refreshData: fetchAllData,
    manualSync,
    toggleAutoSync,
    prepareForOffline,
    optimizeStorage,
    clearCache,
    refreshCache,
    trainModels,
    configureModels
  };
};
