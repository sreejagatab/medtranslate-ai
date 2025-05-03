/**
 * End-to-End Monitoring Service for MedTranslate AI
 *
 * This module provides comprehensive end-to-end transaction monitoring
 * to track the complete lifecycle of translation requests across all components.
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const analyticsService = require('../services/analytics-service');

// Configuration
const CLOUDWATCH_NAMESPACE = process.env.CLOUDWATCH_NAMESPACE || 'MedTranslateAI/EndToEnd';
const TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE || 'MedTranslateTransactions';
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

// Initialize AWS services
const cloudWatch = new AWS.CloudWatch(cloudWatchConfig);
const dynamoDB = new AWS.DynamoDB.DocumentClient(dynamoDbConfig);

/**
 * Start a new end-to-end transaction
 *
 * @param {Object} data - Transaction data
 * @returns {Promise<Object>} - Transaction record
 */
async function startTransaction(data) {
  try {
    const {
      transactionType, // 'translation', 'session', 'sync', etc.
      userId,
      sessionId,
      sourceComponent, // 'frontend', 'edge', 'backend', etc.
      metadata = {}
    } = data;

    // Generate transaction ID
    const transactionId = uuidv4();
    const startTime = new Date().toISOString();

    // Create transaction record
    const transaction = {
      transactionId,
      transactionType,
      userId,
      sessionId,
      sourceComponent,
      startTime,
      status: 'started',
      steps: [{
        component: sourceComponent,
        action: 'start',
        timestamp: startTime,
        status: 'success'
      }],
      metadata,
      lastUpdated: startTime
    };

    // Skip DynamoDB in offline mode
    if (!IS_OFFLINE) {
      // Store transaction in DynamoDB
      await dynamoDB.put({
        TableName: TRANSACTIONS_TABLE,
        Item: transaction
      }).promise();
    }

    // Track event in analytics service
    await analyticsService.trackEvent(
      'transaction_started',
      {
        transactionId,
        transactionType,
        sourceComponent,
        ...metadata
      },
      userId,
      sessionId
    );

    // Publish metric to CloudWatch
    if (!IS_OFFLINE) {
      await cloudWatch.putMetricData({
        Namespace: CLOUDWATCH_NAMESPACE,
        MetricData: [
          {
            MetricName: 'TransactionStarted',
            Dimensions: [
              { Name: 'TransactionType', Value: transactionType },
              { Name: 'SourceComponent', Value: sourceComponent }
            ],
            Value: 1,
            Unit: 'Count'
          }
        ]
      }).promise();
    }

    return {
      transactionId,
      startTime,
      status: 'started'
    };
  } catch (error) {
    console.error('Error starting transaction:', error);
    // Don't throw - monitoring should not block main functionality
    return {
      error: error.message,
      status: 'error'
    };
  }
}

/**
 * Update an existing transaction with a new step
 *
 * @param {Object} data - Transaction update data
 * @returns {Promise<Object>} - Updated transaction
 */
async function updateTransaction(data) {
  try {
    const {
      transactionId,
      component,
      action,
      status = 'success',
      metadata = {},
      errorDetails = null
    } = data;

    if (!transactionId || !component || !action) {
      throw new Error('Missing required parameters: transactionId, component, action');
    }

    const timestamp = new Date().toISOString();

    // Skip DynamoDB in offline mode
    if (IS_OFFLINE) {
      return {
        transactionId,
        status: 'updated',
        timestamp
      };
    }

    // Get existing transaction
    const result = await dynamoDB.get({
      TableName: TRANSACTIONS_TABLE,
      Key: { transactionId }
    }).promise();

    if (!result.Item) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    const transaction = result.Item;

    // Create new step
    const step = {
      component,
      action,
      timestamp,
      status,
      metadata
    };

    if (errorDetails) {
      step.errorDetails = errorDetails;
    }

    // Update transaction
    transaction.steps.push(step);
    transaction.lastUpdated = timestamp;

    // Update status if there's an error
    if (status === 'error') {
      transaction.status = 'error';
      transaction.errorDetails = errorDetails;
    }

    // Update transaction in DynamoDB
    await dynamoDB.put({
      TableName: TRANSACTIONS_TABLE,
      Item: transaction
    }).promise();

    // Publish metric to CloudWatch
    await cloudWatch.putMetricData({
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricData: [
        {
          MetricName: 'TransactionStep',
          Dimensions: [
            { Name: 'Component', Value: component },
            { Name: 'Action', Value: action },
            { Name: 'Status', Value: status }
          ],
          Value: 1,
          Unit: 'Count'
        }
      ]
    }).promise();

    return {
      transactionId,
      status: transaction.status,
      timestamp
    };
  } catch (error) {
    console.error('Error updating transaction:', error);
    // Don't throw - monitoring should not block main functionality
    return {
      transactionId: data.transactionId,
      error: error.message,
      status: 'error'
    };
  }
}

/**
 * Complete a transaction
 *
 * @param {Object} data - Transaction completion data
 * @returns {Promise<Object>} - Completed transaction
 */
async function completeTransaction(data) {
  try {
    const {
      transactionId,
      status = 'completed',
      component,
      metadata = {},
      errorDetails = null
    } = data;

    if (!transactionId) {
      throw new Error('Missing required parameter: transactionId');
    }

    const endTime = new Date().toISOString();

    // Skip DynamoDB in offline mode
    if (IS_OFFLINE) {
      return {
        transactionId,
        status,
        endTime
      };
    }

    // Get existing transaction
    const result = await dynamoDB.get({
      TableName: TRANSACTIONS_TABLE,
      Key: { transactionId }
    }).promise();

    if (!result.Item) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    const transaction = result.Item;

    // Add completion step
    transaction.steps.push({
      component: component || transaction.sourceComponent,
      action: 'complete',
      timestamp: endTime,
      status,
      metadata
    });

    // Update transaction
    transaction.endTime = endTime;
    transaction.status = status;
    transaction.lastUpdated = endTime;
    transaction.duration = new Date(endTime) - new Date(transaction.startTime);

    if (errorDetails) {
      transaction.errorDetails = errorDetails;
    }

    // Update transaction in DynamoDB
    await dynamoDB.put({
      TableName: TRANSACTIONS_TABLE,
      Item: transaction
    }).promise();

    // Track event in analytics service
    await analyticsService.trackEvent(
      'transaction_completed',
      {
        transactionId,
        transactionType: transaction.transactionType,
        duration: transaction.duration,
        status,
        ...metadata
      },
      transaction.userId,
      transaction.sessionId
    );

    // Publish metrics to CloudWatch
    await cloudWatch.putMetricData({
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricData: [
        {
          MetricName: 'TransactionCompleted',
          Dimensions: [
            { Name: 'TransactionType', Value: transaction.transactionType },
            { Name: 'Status', Value: status }
          ],
          Value: 1,
          Unit: 'Count'
        },
        {
          MetricName: 'TransactionDuration',
          Dimensions: [
            { Name: 'TransactionType', Value: transaction.transactionType },
            { Name: 'Status', Value: status }
          ],
          Value: transaction.duration,
          Unit: 'Milliseconds'
        }
      ]
    }).promise();

    return {
      transactionId,
      status,
      endTime,
      duration: transaction.duration
    };
  } catch (error) {
    console.error('Error completing transaction:', error);
    // Don't throw - monitoring should not block main functionality
    return {
      transactionId: data.transactionId,
      error: error.message,
      status: 'error'
    };
  }
}

/**
 * Get transaction details
 *
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} - Transaction details
 */
async function getTransaction(transactionId) {
  try {
    if (!transactionId) {
      throw new Error('Missing required parameter: transactionId');
    }

    // Skip DynamoDB in offline mode
    if (IS_OFFLINE) {
      return {
        transactionId,
        status: 'mock',
        message: 'Mock transaction in offline mode'
      };
    }

    // Get transaction from DynamoDB
    const result = await dynamoDB.get({
      TableName: TRANSACTIONS_TABLE,
      Key: { transactionId }
    }).promise();

    if (!result.Item) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    return result.Item;
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
}

/**
 * Get transactions by user ID
 *
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Transactions
 */
async function getTransactionsByUser(userId, options = {}) {
  try {
    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }

    const {
      limit = 100,
      startDate,
      endDate,
      status,
      transactionType
    } = options;

    // Skip DynamoDB in offline mode
    if (IS_OFFLINE) {
      return {
        transactions: [],
        message: 'Mock transactions in offline mode'
      };
    }

    // Prepare query parameters
    let filterExpression = 'userId = :userId';
    const expressionAttributeValues = {
      ':userId': userId
    };

    if (startDate && endDate) {
      filterExpression += ' AND startTime BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
    }

    if (status) {
      filterExpression += ' AND #status = :status';
      expressionAttributeValues[':status'] = status;
    }

    if (transactionType) {
      filterExpression += ' AND transactionType = :transactionType';
      expressionAttributeValues[':transactionType'] = transactionType;
    }

    // Query DynamoDB
    const params = {
      TableName: TRANSACTIONS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit
    };

    // Add ExpressionAttributeNames if status is used (since it's a reserved word)
    if (status) {
      params.ExpressionAttributeNames = {
        '#status': 'status'
      };
    }

    const result = await dynamoDB.scan(params).promise();

    return {
      transactions: result.Items || [],
      count: result.Count,
      scannedCount: result.ScannedCount
    };
  } catch (error) {
    console.error('Error getting transactions by user:', error);
    throw error;
  }
}

/**
 * Get transactions by session ID
 *
 * @param {string} sessionId - Session ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Transactions
 */
async function getTransactionsBySession(sessionId, options = {}) {
  try {
    if (!sessionId) {
      throw new Error('Missing required parameter: sessionId');
    }

    const {
      limit = 100,
      status,
      transactionType
    } = options;

    // Skip DynamoDB in offline mode
    if (IS_OFFLINE) {
      return {
        transactions: [],
        message: 'Mock transactions in offline mode'
      };
    }

    // Prepare query parameters
    let filterExpression = 'sessionId = :sessionId';
    const expressionAttributeValues = {
      ':sessionId': sessionId
    };

    if (status) {
      filterExpression += ' AND #status = :status';
      expressionAttributeValues[':status'] = status;
    }

    if (transactionType) {
      filterExpression += ' AND transactionType = :transactionType';
      expressionAttributeValues[':transactionType'] = transactionType;
    }

    // Query DynamoDB
    const params = {
      TableName: TRANSACTIONS_TABLE,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit
    };

    // Add ExpressionAttributeNames if status is used (since it's a reserved word)
    if (status) {
      params.ExpressionAttributeNames = {
        '#status': 'status'
      };
    }

    const result = await dynamoDB.scan(params).promise();

    return {
      transactions: result.Items || [],
      count: result.Count,
      scannedCount: result.ScannedCount
    };
  } catch (error) {
    console.error('Error getting transactions by session:', error);
    throw error;
  }
}

/**
 * Get transaction metrics
 *
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Transaction metrics
 */
async function getTransactionMetrics(options = {}) {
  try {
    const {
      startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endTime = new Date().toISOString(),
      transactionType,
      component
    } = options;

    // Skip CloudWatch in offline mode
    if (IS_OFFLINE) {
      return generateMockTransactionMetrics(options);
    }

    // Prepare CloudWatch query parameters
    const dimensions = [];

    if (transactionType) {
      dimensions.push({
        Name: 'TransactionType',
        Value: transactionType
      });
    }

    if (component) {
      dimensions.push({
        Name: 'Component',
        Value: component
      });
    }

    // Get transaction count metrics
    const countParams = {
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricName: 'TransactionCompleted',
      Dimensions: dimensions,
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
      Period: 3600, // 1 hour
      Statistics: ['Sum']
    };

    // Get transaction duration metrics
    const durationParams = {
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricName: 'TransactionDuration',
      Dimensions: dimensions,
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
      Period: 3600, // 1 hour
      Statistics: ['Average', 'Maximum', 'Minimum']
    };

    // Get error count metrics
    const errorParams = {
      Namespace: CLOUDWATCH_NAMESPACE,
      MetricName: 'TransactionCompleted',
      Dimensions: [
        ...dimensions,
        {
          Name: 'Status',
          Value: 'error'
        }
      ],
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
      Period: 3600, // 1 hour
      Statistics: ['Sum']
    };

    // Execute CloudWatch queries
    const [countResult, durationResult, errorResult] = await Promise.all([
      cloudWatch.getMetricStatistics(countParams).promise(),
      cloudWatch.getMetricStatistics(durationParams).promise(),
      cloudWatch.getMetricStatistics(errorParams).promise()
    ]);

    // Process results
    const countDatapoints = countResult.Datapoints.sort((a, b) => a.Timestamp - b.Timestamp);
    const durationDatapoints = durationResult.Datapoints.sort((a, b) => a.Timestamp - b.Timestamp);
    const errorDatapoints = errorResult.Datapoints.sort((a, b) => a.Timestamp - b.Timestamp);

    // Calculate total transactions
    const totalTransactions = countDatapoints.reduce((sum, datapoint) => sum + datapoint.Sum, 0);

    // Calculate total errors
    const totalErrors = errorDatapoints.reduce((sum, datapoint) => sum + datapoint.Sum, 0);

    // Calculate error rate
    const errorRate = totalTransactions > 0 ? (totalErrors / totalTransactions) * 100 : 0;

    // Calculate average duration
    const averageDuration = durationDatapoints.length > 0
      ? durationDatapoints.reduce((sum, datapoint) => sum + datapoint.Average, 0) / durationDatapoints.length
      : 0;

    // Calculate maximum duration
    const maxDuration = durationDatapoints.length > 0
      ? Math.max(...durationDatapoints.map(datapoint => datapoint.Maximum))
      : 0;

    return {
      totalTransactions,
      totalErrors,
      errorRate,
      averageDuration,
      maxDuration,
      timeSeries: {
        count: countDatapoints.map(datapoint => ({
          timestamp: datapoint.Timestamp,
          value: datapoint.Sum
        })),
        duration: durationDatapoints.map(datapoint => ({
          timestamp: datapoint.Timestamp,
          average: datapoint.Average,
          max: datapoint.Maximum,
          min: datapoint.Minimum
        })),
        errors: errorDatapoints.map(datapoint => ({
          timestamp: datapoint.Timestamp,
          value: datapoint.Sum
        }))
      }
    };
  } catch (error) {
    console.error('Error getting transaction metrics:', error);
    return generateMockTransactionMetrics(options);
  }
}

/**
 * Generate mock transaction metrics for development
 *
 * @param {Object} options - Query options
 * @returns {Object} - Mock transaction metrics
 */
function generateMockTransactionMetrics(options = {}) {
  const {
    startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endTime = new Date().toISOString()
  } = options;

  // Parse dates
  const start = new Date(startTime);
  const end = new Date(endTime);
  const hours = Math.ceil((end - start) / (1000 * 60 * 60));

  // Generate time series data
  const timeSeries = {
    count: [],
    duration: [],
    errors: []
  };

  // Total values
  let totalTransactions = 0;
  let totalErrors = 0;
  let totalDuration = 0;
  let maxDuration = 0;

  // Generate data for each hour
  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(start.getTime() + i * 60 * 60 * 1000);
    
    // Generate random values
    const count = Math.floor(Math.random() * 50) + 10;
    const errors = Math.floor(Math.random() * count * 0.1); // 0-10% error rate
    const avgDuration = Math.floor(Math.random() * 500) + 100; // 100-600ms
    const maxHourDuration = avgDuration * (1 + Math.random()); // Up to 2x average
    const minDuration = avgDuration * (1 - Math.random() * 0.5); // Down to 0.5x average

    // Add to time series
    timeSeries.count.push({
      timestamp,
      value: count
    });

    timeSeries.duration.push({
      timestamp,
      average: avgDuration,
      max: maxHourDuration,
      min: minDuration
    });

    timeSeries.errors.push({
      timestamp,
      value: errors
    });

    // Update totals
    totalTransactions += count;
    totalErrors += errors;
    totalDuration += avgDuration;
    maxDuration = Math.max(maxDuration, maxHourDuration);
  }

  // Calculate averages
  const averageDuration = hours > 0 ? totalDuration / hours : 0;
  const errorRate = totalTransactions > 0 ? (totalErrors / totalTransactions) * 100 : 0;

  return {
    totalTransactions,
    totalErrors,
    errorRate,
    averageDuration,
    maxDuration,
    timeSeries,
    isMockData: true
  };
}

module.exports = {
  startTransaction,
  updateTransaction,
  completeTransaction,
  getTransaction,
  getTransactionsByUser,
  getTransactionsBySession,
  getTransactionMetrics
};
