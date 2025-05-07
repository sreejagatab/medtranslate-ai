/**
 * Unit Tests for Sync Analytics Controller
 * 
 * These tests verify that the sync analytics controller functions correctly.
 */

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const syncAnalyticsController = require('../../controllers/sync-analytics-controller');

// Mock axios
const mockAxios = new MockAdapter(axios);

// Mock Express request and response
const mockRequest = () => {
  const req = {};
  req.params = {};
  req.query = {};
  req.body = {};
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Sync Analytics Controller', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockAxios.reset();
  });

  describe('getSyncStatus', () => {
    it('should return sync status from all devices', async () => {
      // Mock axios response for device 1
      mockAxios.onGet('http://localhost:3002/sync/status').reply(200, {
        enabled: true,
        inProgress: false,
        lastSyncTime: 1746138009497,
        lastSyncStatus: 'success',
        queueSize: 5,
        interval: 300000,
        metrics: {
          totalSyncs: 120,
          successfulSyncs: 118,
          itemsSynced: 1450,
          conflicts: 3,
          conflictsResolved: 3
        }
      });

      const req = mockRequest();
      const res = mockResponse();

      await syncAnalyticsController.getSyncStatus(req, res);

      // Check that response.json was called with the correct data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          devices: expect.arrayContaining([
            expect.objectContaining({
              deviceId: 'edge-device-1',
              deviceName: 'Hospital Wing A',
              status: expect.objectContaining({
                enabled: true,
                inProgress: false,
                lastSyncStatus: 'success',
                queueSize: 5
              }),
              online: true
            })
          ])
        })
      );
    });

    it('should handle device offline status', async () => {
      // Mock axios response for device 1 (error)
      mockAxios.onGet('http://localhost:3002/sync/status').networkError();

      const req = mockRequest();
      const res = mockResponse();

      await syncAnalyticsController.getSyncStatus(req, res);

      // Check that response.json was called with the correct data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          devices: expect.arrayContaining([
            expect.objectContaining({
              deviceId: 'edge-device-1',
              deviceName: 'Hospital Wing A',
              status: null,
              online: false,
              error: expect.any(String)
            })
          ])
        })
      );
    });

    it('should handle server errors', async () => {
      // Force an error in the controller
      mockAxios.onGet('http://localhost:3002/sync/status').reply(500, {
        error: 'Internal server error'
      });

      const req = mockRequest();
      const res = mockResponse();

      // Mock a failure in the axios request
      jest.spyOn(axios, 'get').mockImplementation(() => {
        throw new Error('Server error');
      });

      await syncAnalyticsController.getSyncStatus(req, res);

      // Check that response.status and response.json were called with the correct data
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );

      // Restore the original implementation
      axios.get.mockRestore();
    });
  });

  describe('getSyncMetrics', () => {
    it('should return sync metrics from all devices', async () => {
      // Mock axios response for device 1
      mockAxios.onGet('http://localhost:3002/sync/metrics').reply(200, {
        totalSyncs: 120,
        successfulSyncs: 118,
        failedSyncs: 2,
        itemsSynced: 1450,
        itemsFailed: 5,
        conflicts: 3,
        conflictsResolved: 3,
        bytesUploaded: 2500000,
        bytesDownloaded: 1200000,
        compressionSavings: 450000,
        lastReset: 1746135909337,
        syncDurations: [2500, 1800, 2200],
        lastUpdated: 1746138009497
      });

      const req = mockRequest();
      const res = mockResponse();

      await syncAnalyticsController.getSyncMetrics(req, res);

      // Check that response.json was called with the correct data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          devices: expect.arrayContaining([
            expect.objectContaining({
              deviceId: 'edge-device-1',
              deviceName: 'Hospital Wing A',
              metrics: expect.objectContaining({
                totalSyncs: 120,
                successfulSyncs: 118,
                failedSyncs: 2,
                itemsSynced: 1450
              }),
              online: true
            })
          ])
        })
      );
    });
  });

  describe('getQualityMetrics', () => {
    it('should return quality metrics from all devices', async () => {
      // Mock axios response for device 1
      mockAxios.onGet('http://localhost:3002/sync/quality').reply(200, {
        modelPerformance: {
          'claude-3-sonnet': {
            averageConfidence: 0.92,
            accuracy: 0.95,
            usageCount: 450
          },
          'claude-3-haiku': {
            averageConfidence: 0.88,
            accuracy: 0.91,
            usageCount: 320
          }
        },
        contextPerformance: {
          general: {
            averageConfidence: 0.90,
            accuracy: 0.93,
            usageCount: 380
          },
          cardiology: {
            averageConfidence: 0.94,
            accuracy: 0.96,
            usageCount: 210
          }
        }
      });

      const req = mockRequest();
      const res = mockResponse();

      await syncAnalyticsController.getQualityMetrics(req, res);

      // Check that response.json was called with the correct data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          devices: expect.arrayContaining([
            expect.objectContaining({
              deviceId: 'edge-device-1',
              deviceName: 'Hospital Wing A',
              quality: expect.objectContaining({
                modelPerformance: expect.objectContaining({
                  'claude-3-sonnet': expect.objectContaining({
                    averageConfidence: 0.92,
                    accuracy: 0.95
                  })
                })
              }),
              online: true
            })
          ])
        })
      );
    });
  });

  describe('triggerManualSync', () => {
    it('should trigger a manual sync on a specific device', async () => {
      // Mock axios response for manual sync
      mockAxios.onPost('http://localhost:3002/sync/manual').reply(200, {
        success: true,
        syncedItems: 5,
        conflicts: 0,
        duration: 2500
      });

      const req = mockRequest();
      req.params.deviceId = 'edge-device-1';
      const res = mockResponse();

      await syncAnalyticsController.triggerManualSync(req, res);

      // Check that response.json was called with the correct data
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          result: expect.objectContaining({
            success: true,
            syncedItems: 5,
            conflicts: 0,
            duration: 2500
          })
        })
      );
    });

    it('should return an error if deviceId is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await syncAnalyticsController.triggerManualSync(req, res);

      // Check that response.status and response.json were called with the correct data
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Device ID is required'
        })
      );
    });

    it('should handle device errors', async () => {
      // Mock axios response for manual sync (error)
      mockAxios.onPost('http://localhost:3002/sync/manual').networkError();

      const req = mockRequest();
      req.params.deviceId = 'edge-device-1';
      const res = mockResponse();

      await syncAnalyticsController.triggerManualSync(req, res);

      // Check that response.status and response.json were called with the correct data
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });
  });
});
