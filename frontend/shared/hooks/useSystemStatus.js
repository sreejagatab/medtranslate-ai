/**
 * useSystemStatus Hook for MedTranslate AI
 * 
 * This hook provides access to system status information and control functions
 * for the ML models, predictive caching system, auto-sync-manager, and storage-optimizer.
 * It integrates with the backend services to provide a unified interface for
 * accessing and controlling these components.
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
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
      const response = await axios.get(CACHE_STATS_ENDPOINT);
      setCacheStats(response.data);
      
      // Extract offline readiness and risk from cache stats
      if (response.data.offlineReadiness !== undefined) {
        setOfflineReadiness(response.data.offlineReadiness);
      }
      
      if (response.data.offlineRisk !== undefined) {
        setOfflineRisk(response.data.offlineRisk);
      }
      
      if (response.data.mlPredictions !== undefined) {
        setMlPredictions(response.data.mlPredictions);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      setError('Failed to fetch cache statistics');
    }
  }, [CACHE_STATS_ENDPOINT]);

  // Fetch ML performance
  const fetchMlPerformance = useCallback(async () => {
    try {
      const response = await axios.get(ML_PERFORMANCE_ENDPOINT);
      setMlPerformance(response.data);
    } catch (error) {
      console.error('Error fetching ML performance:', error);
      setError('Failed to fetch ML performance metrics');
    }
  }, [ML_PERFORMANCE_ENDPOINT]);

  // Fetch ML performance history
  const fetchMlPerformanceHistory = useCallback(async () => {
    try {
      const response = await axios.get(ML_PERFORMANCE_HISTORY_ENDPOINT);
      setMlPerformanceHistory(response.data);
    } catch (error) {
      console.error('Error fetching ML performance history:', error);
      setError('Failed to fetch ML performance history');
    }
  }, [ML_PERFORMANCE_HISTORY_ENDPOINT]);

  // Fetch storage info
  const fetchStorageInfo = useCallback(async () => {
    try {
      const response = await axios.get(STORAGE_INFO_ENDPOINT);
      setStorageInfo(response.data);
    } catch (error) {
      console.error('Error fetching storage info:', error);
      setError('Failed to fetch storage information');
    }
  }, [STORAGE_INFO_ENDPOINT]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await axios.get(SYNC_STATUS_ENDPOINT);
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setError('Failed to fetch sync status');
    }
  }, [SYNC_STATUS_ENDPOINT]);

  // Fetch sync history
  const fetchSyncHistory = useCallback(async () => {
    try {
      const response = await axios.get(SYNC_HISTORY_ENDPOINT);
      setSyncHistory(response.data);
    } catch (error) {
      console.error('Error fetching sync history:', error);
      setError('Failed to fetch sync history');
    }
  }, [SYNC_HISTORY_ENDPOINT]);

  // Fetch device performance
  const fetchDevicePerformance = useCallback(async () => {
    try {
      const response = await axios.get(DEVICE_PERFORMANCE_ENDPOINT);
      setDevicePerformance(response.data);
    } catch (error) {
      console.error('Error fetching device performance:', error);
      setError('Failed to fetch device performance metrics');
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

  // Control functions
  const trainModels = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ml/train`);
      await fetchMlPerformance();
      return response.data;
    } catch (error) {
      console.error('Error training ML models:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchMlPerformance]);

  const configureModels = useCallback(async (options) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ml/configure`, options);
      await fetchMlPerformance();
      return response.data;
    } catch (error) {
      console.error('Error configuring ML models:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchMlPerformance]);

  const manualSync = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sync/manual`);
      await Promise.all([fetchSyncStatus(), fetchSyncHistory()]);
      return response.data;
    } catch (error) {
      console.error('Error performing manual sync:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchSyncStatus, fetchSyncHistory]);

  const toggleAutoSync = useCallback(async (enabled) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/sync/toggle`, { enabled });
      await fetchSyncStatus();
      return response.data;
    } catch (error) {
      console.error('Error toggling auto-sync:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchSyncStatus]);

  const prepareForOffline = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/offline/prepare`);
      await Promise.all([fetchCacheStats(), fetchStorageInfo()]);
      return response.data;
    } catch (error) {
      console.error('Error preparing for offline mode:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchCacheStats, fetchStorageInfo]);

  const optimizeStorage = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/storage/optimize`);
      await fetchStorageInfo();
      return response.data;
    } catch (error) {
      console.error('Error optimizing storage:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchStorageInfo]);

  const clearCache = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cache/clear`);
      await fetchCacheStats();
      return response.data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchCacheStats]);

  const refreshCache = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cache/refresh`);
      await fetchCacheStats();
      return response.data;
    } catch (error) {
      console.error('Error refreshing cache:', error);
      throw error;
    }
  }, [API_BASE_URL, fetchCacheStats]);

  // Effect to fetch data on mount
  useEffect(() => {
    fetchAllData();
    
    // Set up refresh interval
    const interval = setInterval(fetchAllData, 60000); // Refresh every minute
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [fetchAllData]);

  // Effect to handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // Handle different message types
        switch (data.type) {
          case 'cache_stats_update':
            setCacheStats(data.payload);
            if (data.payload.offlineReadiness !== undefined) {
              setOfflineReadiness(data.payload.offlineReadiness);
            }
            if (data.payload.offlineRisk !== undefined) {
              setOfflineRisk(data.payload.offlineRisk);
            }
            if (data.payload.mlPredictions !== undefined) {
              setMlPredictions(data.payload.mlPredictions);
            }
            break;
          case 'ml_performance_update':
            setMlPerformance(data.payload);
            break;
          case 'storage_info_update':
            setStorageInfo(data.payload);
            break;
          case 'sync_status_update':
            setSyncStatus(data.payload);
            break;
          case 'device_performance_update':
            setDevicePerformance(data.payload);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  return {
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
    trainModels,
    configureModels,
    manualSync,
    toggleAutoSync,
    prepareForOffline,
    optimizeStorage,
    clearCache,
    refreshCache,
    refreshData: fetchAllData
  };
};
