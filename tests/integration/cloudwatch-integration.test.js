/**
 * Integration Tests for CloudWatch Integration
 * 
 * This file contains integration tests for the CloudWatch integration
 * with mock AWS services.
 */

const AWS = require('aws-sdk');
const cloudWatchService = require('../../backend/services/cloudwatch-service');
const healthCheckController = require('../../backend/controllers/health-check-controller');

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockCloudWatch = {
    putMetricData: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    putMetricAlarm: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  };
  
  const mockCloudWatchLogs = {
    createLogGroup: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    createLogStream: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    putLogEvents: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  };
  
  return {
    CloudWatch: jest.fn(() => mockCloudWatch),
    CloudWatchLogs: jest.fn(() => mockCloudWatchLogs),
    config: {
      update: jest.fn()
    },
    SharedIniFileCredentials: jest.fn()
  };
});

// Mock the edge service client
jest.mock('../../backend/services/edge-service-client', () => ({
  getCacheStats: jest.fn().mockResolvedValue({
    cacheSize: 1024 * 1024 * 10,
    itemCount: 100,
    hitRate: 0.85,
    lastUpdated: new Date(),
    compressionRatio: 2.5,
    cacheEfficiency: 0.9,
    averageCacheAge: 300000,
    prioritizedItems: 20
  }),
  getDevicePerformance: jest.fn().mockResolvedValue({
    cpuUsage: 0.45,
    cpuCores: 8,
    memoryUsage: 0.6,
    freeMemoryMB: 4096,
    network: {
      connectionType: 'wifi',
      online: true,
      signalStrength: 0.85,
      downloadSpeedMbps: 50,
      uploadSpeedMbps: 20,
      latencyMs: 35,
      connectionStability: 0.9
    },
    battery: {
      level: 0.75,
      charging: true,
      timeRemaining: 180
    }
  }),
  getStorageInfo: jest.fn().mockResolvedValue({
    usagePercentage: 65,
    currentUsageMB: 650,
    quotaMB: 1000,
    reservedForOfflineMB: 200,
    compressionSavingsMB: 150,
    priorityItemCount: 30,
    lastOptimizationTime: new Date()
  })
}));

// Mock the alerting service
jest.mock('../../backend/services/alerting-service', () => ({
  sendComponentErrorAlert: jest.fn().mockResolvedValue({})
}));

// Mock Express request and response
const mockRequest = () => {
  return {
    query: {},
    params: {}
  };
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('CloudWatch Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  it('should send system health metrics to CloudWatch', async () => {
    // Create mock system health data
    const systemHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: 'healthy',
          responseTime: 45,
          details: {
            connections: 5,
            maxConnections: 20
          }
        },
        translation_service: {
          status: 'healthy',
          responseTime: 120,
          details: {
            models: 5,
            activeRequests: 2
          }
        }
      },
      system: {
        uptime: 86400,
        loadAvg: [0.5, 0.7, 0.8],
        memory: {
          total: 8589934592,
          free: 4294967296
        },
        cpus: 8
      }
    };
    
    // Call the sendSystemHealthMetrics function
    await cloudWatchService.sendSystemHealthMetrics(systemHealth);
    
    // Check if AWS CloudWatch putMetricData was called
    const cloudWatch = new AWS.CloudWatch();
    expect(cloudWatch.putMetricData).toHaveBeenCalled();
    
    // Check if the putMetricData function was called with the correct parameters
    const putMetricDataCall = cloudWatch.putMetricData.mock.calls[0][0];
    expect(putMetricDataCall).toHaveProperty('Namespace');
    expect(putMetricDataCall).toHaveProperty('MetricData');
    expect(Array.isArray(putMetricDataCall.MetricData)).toBe(true);
    
    // Check if the metrics include system status
    const systemStatusMetric = putMetricDataCall.MetricData.find(metric => metric.MetricName === 'SystemStatus');
    expect(systemStatusMetric).toBeDefined();
    expect(systemStatusMetric.Value).toBe(1); // 1 for healthy
    
    // Check if the metrics include component status
    const componentStatusMetrics = putMetricDataCall.MetricData.filter(metric => metric.MetricName === 'ComponentStatus');
    expect(componentStatusMetrics.length).toBe(2); // One for each component
    
    // Check if the metrics include component response time
    const componentResponseTimeMetrics = putMetricDataCall.MetricData.filter(metric => metric.MetricName === 'ComponentResponseTime');
    expect(componentResponseTimeMetrics.length).toBe(2); // One for each component
  });
  
  it('should send logs to CloudWatch', async () => {
    // Call the sendLog function
    await cloudWatchService.sendLog(
      'Test log message',
      { key: 'value' },
      'info'
    );
    
    // Check if AWS CloudWatch Logs putLogEvents was called
    const cloudWatchLogs = new AWS.CloudWatchLogs();
    expect(cloudWatchLogs.putLogEvents).toHaveBeenCalled();
    
    // Check if the putLogEvents function was called with the correct parameters
    const putLogEventsCall = cloudWatchLogs.putLogEvents.mock.calls[0][0];
    expect(putLogEventsCall).toHaveProperty('logGroupName');
    expect(putLogEventsCall).toHaveProperty('logStreamName');
    expect(putLogEventsCall).toHaveProperty('logEvents');
    expect(Array.isArray(putLogEventsCall.logEvents)).toBe(true);
    expect(putLogEventsCall.logEvents.length).toBe(1);
    
    // Check if the log event includes the message
    const logEvent = putLogEventsCall.logEvents[0];
    expect(logEvent).toHaveProperty('timestamp');
    expect(logEvent).toHaveProperty('message');
    
    // Parse the message JSON
    const logMessage = JSON.parse(logEvent.message);
    expect(logMessage).toHaveProperty('level', 'info');
    expect(logMessage).toHaveProperty('message', 'Test log message');
    expect(logMessage).toHaveProperty('data');
    expect(logMessage.data).toHaveProperty('key', 'value');
  });
  
  it('should create CloudWatch alarms', async () => {
    // Call the createAlarm function
    await cloudWatchService.createAlarm({
      name: 'TestAlarm',
      description: 'Test alarm description',
      metricName: 'ComponentStatus',
      dimensions: {
        Environment: 'test',
        Component: 'database'
      },
      threshold: 0.1,
      comparisonOperator: 'LessThanThreshold',
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      period: 60,
      statistic: 'Minimum'
    });
    
    // Check if AWS CloudWatch putMetricAlarm was called
    const cloudWatch = new AWS.CloudWatch();
    expect(cloudWatch.putMetricAlarm).toHaveBeenCalled();
    
    // Check if the putMetricAlarm function was called with the correct parameters
    const putMetricAlarmCall = cloudWatch.putMetricAlarm.mock.calls[0][0];
    expect(putMetricAlarmCall).toHaveProperty('AlarmName', 'TestAlarm');
    expect(putMetricAlarmCall).toHaveProperty('AlarmDescription', 'Test alarm description');
    expect(putMetricAlarmCall).toHaveProperty('MetricName', 'ComponentStatus');
    expect(putMetricAlarmCall).toHaveProperty('Dimensions');
    expect(Array.isArray(putMetricAlarmCall.Dimensions)).toBe(true);
    expect(putMetricAlarmCall.Dimensions.length).toBe(2);
    expect(putMetricAlarmCall).toHaveProperty('Threshold', 0.1);
    expect(putMetricAlarmCall).toHaveProperty('ComparisonOperator', 'LessThanThreshold');
    expect(putMetricAlarmCall).toHaveProperty('EvaluationPeriods', 1);
    expect(putMetricAlarmCall).toHaveProperty('DatapointsToAlarm', 1);
    expect(putMetricAlarmCall).toHaveProperty('Period', 60);
    expect(putMetricAlarmCall).toHaveProperty('Statistic', 'Minimum');
  });
  
  it('should send metrics and create alarms for unhealthy components', async () => {
    // Mock component checks to return unhealthy status
    const originalComponentChecks = { ...healthCheckController.componentChecks };
    
    // Override database component check to return error status
    healthCheckController.componentChecks.database = jest.fn().mockResolvedValue({
      status: 'error',
      responseTime: 0,
      details: {
        error: 'Database connection failed'
      }
    });
    
    // Create mock request and response
    const req = mockRequest();
    const res = mockResponse();
    
    // Call the getSystemHealth function
    await healthCheckController.getSystemHealth(req, res);
    
    // Check if CloudWatch putMetricData was called
    const cloudWatch = new AWS.CloudWatch();
    expect(cloudWatch.putMetricData).toHaveBeenCalled();
    
    // Check if CloudWatch putMetricAlarm was called
    expect(cloudWatch.putMetricAlarm).toHaveBeenCalled();
    
    // Restore original component checks
    healthCheckController.componentChecks = originalComponentChecks;
  });
});
