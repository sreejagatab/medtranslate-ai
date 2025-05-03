import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import WebSocketStatus from './WebSocketStatus';
import EnhancedWebSocketStatus from './EnhancedWebSocketStatus';
import OfflineQueueStatus from './OfflineQueueStatus';
import NetworkQualityIndicator from './NetworkQualityIndicator';
import CachingStatusIndicator from './CachingStatusIndicator';

/**
 * ConnectionStatusBar component combines WebSocket status, network quality, offline queue status,
 * and caching status in a single bar for easy monitoring of connection health.
 */
const ConnectionStatusBar = ({
  webSocketService,
  style = {},
  useEnhancedStatus = true,
  simplified = false,
  showNetworkQuality = true,
  showCachingStatus = true
}) => {
  const [cacheStats, setCacheStats] = useState({});
  const [offlineReadiness, setOfflineReadiness] = useState(0);
  const [offlineRisk, setOfflineRisk] = useState(0);

  // Fetch cache stats and offline readiness periodically
  useEffect(() => {
    const fetchCacheStats = async () => {
      try {
        // This would typically fetch from an API
        // For now, we'll use mock data
        const response = await webSocketService.sendRequest({
          type: 'get_cache_stats'
        });

        if (response && response.success) {
          setCacheStats(response.stats || {});
          setOfflineReadiness(response.offlineReadiness || 0);
          setOfflineRisk(response.offlineRisk || 0);
        }
      } catch (error) {
        console.error('Error fetching cache stats:', error);
      }
    };

    // Initial fetch
    fetchCacheStats();

    // Set up interval
    const interval = setInterval(fetchCacheStats, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [webSocketService]);

  return (
    <View style={[styles.container, style.container]}>
      {useEnhancedStatus ? (
        <EnhancedWebSocketStatus
          style={style.webSocketStatus}
          simplified={simplified}
        />
      ) : (
        <WebSocketStatus
          websocketService={webSocketService}
          style={style.webSocketStatus}
        />
      )}

      {showNetworkQuality && (
        <NetworkQualityIndicator
          webSocketService={webSocketService}
          style={style.networkQualityIndicator}
        />
      )}

      {showCachingStatus && (
        <CachingStatusIndicator
          cacheStats={cacheStats}
          offlineReadiness={offlineReadiness}
          offlineRisk={offlineRisk}
          style={style.cachingStatusIndicator}
        />
      )}

      <OfflineQueueStatus
        webSocketService={webSocketService}
        style={style.offlineQueueStatus}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
});

ConnectionStatusBar.propTypes = {
  webSocketService: PropTypes.object.isRequired,
  style: PropTypes.object,
  useEnhancedStatus: PropTypes.bool,
  simplified: PropTypes.bool,
  showNetworkQuality: PropTypes.bool,
  showCachingStatus: PropTypes.bool
};

export default ConnectionStatusBar;
