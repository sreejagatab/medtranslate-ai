/**
 * Analytics Service for MedTranslate AI
 *
 * This module provides monitoring and analytics capabilities
 * to track system performance and usage.
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CLOUDWATCH_NAMESPACE = process.env.CLOUDWATCH_NAMESPACE || 'MedTranslateAI';
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'MedTranslateAnalytics';
const IS_OFFLINE = process.env.IS_OFFLINE === 'true';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Set global AWS region
AWS.config.update({ region: AWS_REGION });

// Configure AWS services
const cloudWatchConfig = {
  region: AWS_REGION
};
const dynamoDbConfig = {
  region: AWS_REGION
};

if (IS_OFFLINE) {
  cloudWatchConfig.endpoint = 'http://localhost:4582';
  dynamoDbConfig.endpoint = 'http://localhost:8000';
}

const cloudWatch = new AWS.CloudWatch(cloudWatchConfig);
const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);

/**
 * Record a translation event
 *
 * @param {Object} data - Translation event data
 * @returns {Promise<void>}
 */
async function recordTranslationEvent(data) {
  try {
    const {
      sessionId,
      userId,
      userType,
      sourceLanguage,
      targetLanguage,
      textLength,
      processingTime,
      success,
      errorType,
      isAudio,
      isOffline,
      deviceType,
      medicalContext
    } = data;

    // Create event record
    const event = {
      event_id: uuidv4(),
      event_type: 'translation',
      session_id: sessionId,
      user_id: userId,
      user_type: userType || 'unknown',
      source_language: sourceLanguage,
      target_language: targetLanguage,
      text_length: textLength || 0,
      processing_time: processingTime || 0,
      success: success !== false,
      error_type: errorType || null,
      is_audio: isAudio === true,
      is_offline: isOffline === true,
      device_type: deviceType || 'unknown',
      medical_context: medicalContext || 'general',
      timestamp: new Date().toISOString(),
      year_month: new Date().toISOString().substring(0, 7) // YYYY-MM format for partitioning
    };

    // Save to DynamoDB
    await dynamoDB.put({
      TableName: ANALYTICS_TABLE,
      Item: event
    }).promise();

    // Send metrics to CloudWatch
    await cloudWatch.putMetricData({
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricData: [
        {
          MetricName: 'TranslationCount',
          Dimensions: [
            { Name: 'SourceLanguage', Value: sourceLanguage },
            { Name: 'TargetLanguage', Value: targetLanguage }
          ],
          Value: 1,
          Unit: 'Count'
        },
        {
          MetricName: 'TranslationProcessingTime',
          Dimensions: [
            { Name: 'SourceLanguage', Value: sourceLanguage },
            { Name: 'TargetLanguage', Value: targetLanguage }
          ],
          Value: processingTime || 0,
          Unit: 'Milliseconds'
        },
        {
          MetricName: 'TranslationSuccess',
          Dimensions: [
            { Name: 'SourceLanguage', Value: sourceLanguage },
            { Name: 'TargetLanguage', Value: targetLanguage }
          ],
          Value: success !== false ? 1 : 0,
          Unit: 'Count'
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Error recording translation event:', error);
    // Don't throw - analytics should not block main functionality
  }
}

/**
 * Record a session event
 *
 * @param {Object} data - Session event data
 * @returns {Promise<void>}
 */
async function recordSessionEvent(data) {
  try {
    const {
      sessionId,
      providerId,
      eventType, // 'create', 'join', 'end'
      patientLanguage,
      deviceType,
      medicalContext
    } = data;

    // Create event record
    const event = {
      event_id: uuidv4(),
      event_type: `session_${eventType}`,
      session_id: sessionId,
      provider_id: providerId,
      patient_language: patientLanguage,
      device_type: deviceType || 'unknown',
      medical_context: medicalContext || 'general',
      timestamp: new Date().toISOString(),
      year_month: new Date().toISOString().substring(0, 7) // YYYY-MM format for partitioning
    };

    // Save to DynamoDB
    await dynamoDB.put({
      TableName: ANALYTICS_TABLE,
      Item: event
    }).promise();

    // Send metrics to CloudWatch
    await cloudWatch.putMetricData({
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricData: [
        {
          MetricName: `Session${eventType.charAt(0).toUpperCase() + eventType.slice(1)}Count`,
          Dimensions: [
            { Name: 'PatientLanguage', Value: patientLanguage || 'unknown' },
            { Name: 'MedicalContext', Value: medicalContext || 'general' }
          ],
          Value: 1,
          Unit: 'Count'
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Error recording session event:', error);
    // Don't throw - analytics should not block main functionality
  }
}

/**
 * Record an error event
 *
 * @param {Object} data - Error event data
 * @returns {Promise<void>}
 */
async function recordErrorEvent(data) {
  try {
    const {
      errorType,
      errorMessage,
      component,
      sessionId,
      userId,
      userType,
      deviceType
    } = data;

    // Create event record
    const event = {
      event_id: uuidv4(),
      event_type: 'error',
      error_type: errorType || 'unknown',
      error_message: errorMessage,
      component: component || 'unknown',
      session_id: sessionId,
      user_id: userId,
      user_type: userType || 'unknown',
      device_type: deviceType || 'unknown',
      timestamp: new Date().toISOString(),
      year_month: new Date().toISOString().substring(0, 7) // YYYY-MM format for partitioning
    };

    // Save to DynamoDB
    await dynamoDB.put({
      TableName: ANALYTICS_TABLE,
      Item: event
    }).promise();

    // Send metrics to CloudWatch
    await cloudWatch.putMetricData({
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricData: [
        {
          MetricName: 'ErrorCount',
          Dimensions: [
            { Name: 'ErrorType', Value: errorType || 'unknown' },
            { Name: 'Component', Value: component || 'unknown' }
          ],
          Value: 1,
          Unit: 'Count'
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Error recording error event:', error);
    // Don't throw - analytics should not block main functionality
  }
}

/**
 * Record system performance metrics
 *
 * @param {Object} data - Performance metrics data
 * @returns {Promise<void>}
 */
async function recordPerformanceMetrics(data) {
  try {
    const {
      component,
      operation,
      responseTime,
      cpuUsage,
      memoryUsage,
      successRate
    } = data;

    // Send metrics to CloudWatch
    await cloudWatch.putMetricData({
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricData: [
        {
          MetricName: 'ResponseTime',
          Dimensions: [
            { Name: 'Component', Value: component },
            { Name: 'Operation', Value: operation }
          ],
          Value: responseTime,
          Unit: 'Milliseconds'
        },
        {
          MetricName: 'CPUUsage',
          Dimensions: [
            { Name: 'Component', Value: component }
          ],
          Value: cpuUsage,
          Unit: 'Percent'
        },
        {
          MetricName: 'MemoryUsage',
          Dimensions: [
            { Name: 'Component', Value: component }
          ],
          Value: memoryUsage,
          Unit: 'Megabytes'
        },
        {
          MetricName: 'SuccessRate',
          Dimensions: [
            { Name: 'Component', Value: component },
            { Name: 'Operation', Value: operation }
          ],
          Value: successRate,
          Unit: 'Percent'
        }
      ]
    }).promise();
  } catch (error) {
    console.error('Error recording performance metrics:', error);
    // Don't throw - analytics should not block main functionality
  }
}

/**
 * Get analytics data for a specific time period
 *
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Analytics data
 */
async function getAnalyticsData(params) {
  try {
    const {
      startDate,
      endDate,
      eventType,
      groupBy
    } = params;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate || new Date());

    if (isNaN(start.getTime())) {
      throw new Error('Invalid start date');
    }

    // Format dates for query
    const startTimestamp = start.toISOString();
    const endTimestamp = end.toISOString();

    // Build query
    const queryParams = {
      TableName: ANALYTICS_TABLE,
      IndexName: 'TimestampIndex',
      KeyConditionExpression: 'year_month = :ym AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':ym': startTimestamp.substring(0, 7),
        ':start': startTimestamp,
        ':end': endTimestamp
      }
    };

    // Add filter for event type if specified
    if (eventType) {
      queryParams.FilterExpression = 'event_type = :et';
      queryParams.ExpressionAttributeValues[':et'] = eventType;
    }

    // Execute query
    const result = await dynamoDB.query(queryParams).promise();

    // Process results based on groupBy parameter
    let processedData = result.Items;

    if (groupBy) {
      const groupedData = {};

      for (const item of result.Items) {
        const key = item[groupBy];

        if (!groupedData[key]) {
          groupedData[key] = [];
        }

        groupedData[key].push(item);
      }

      processedData = groupedData;
    }

    return {
      success: true,
      data: processedData,
      count: result.Items.length
    };
  } catch (error) {
    console.error('Error getting analytics data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get system performance dashboard data
 *
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Dashboard data
 */
async function getPerformanceDashboard(params) {
  try {
    const {
      startDate,
      endDate,
      component
    } = params;

    // Validate dates
    const start = new Date(startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)); // Default to last 24 hours
    const end = new Date(endDate || new Date());

    if (isNaN(start.getTime())) {
      throw new Error('Invalid start date');
    }

    // Get CloudWatch metrics
    const metricParams = {
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricName: 'ResponseTime',
      StartTime: start,
      EndTime: end,
      Period: 3600, // 1 hour
      Statistics: ['Average', 'Maximum', 'Minimum']
    };

    if (component) {
      metricParams.Dimensions = [
        { Name: 'Component', Value: component }
      ];
    }

    const metrics = await cloudWatch.getMetricStatistics(metricParams).promise();

    // Get error counts
    const errorParams = {
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricName: 'ErrorCount',
      StartTime: start,
      EndTime: end,
      Period: 3600, // 1 hour
      Statistics: ['Sum']
    };

    if (component) {
      errorParams.Dimensions = [
        { Name: 'Component', Value: component }
      ];
    }

    const errors = await cloudWatch.getMetricStatistics(errorParams).promise();

    // Get success rate
    const successParams = {
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricName: 'SuccessRate',
      StartTime: start,
      EndTime: end,
      Period: 3600, // 1 hour
      Statistics: ['Average']
    };

    if (component) {
      successParams.Dimensions = [
        { Name: 'Component', Value: component }
      ];
    }

    const successRate = await cloudWatch.getMetricStatistics(successParams).promise();

    return {
      success: true,
      responseTime: metrics.Datapoints,
      errors: errors.Datapoints,
      successRate: successRate.Datapoints
    };
  } catch (error) {
    console.error('Error getting performance dashboard:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  recordTranslationEvent,
  recordSessionEvent,
  recordErrorEvent,
  recordPerformanceMetrics,
  getAnalyticsData,
  getPerformanceDashboard
};
