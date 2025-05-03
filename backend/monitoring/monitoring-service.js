/**
 * Monitoring Service for MedTranslate AI
 *
 * Provides system health and performance monitoring capabilities
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CLOUDWATCH_NAMESPACE = process.env.CLOUDWATCH_NAMESPACE || 'MedTranslateAI';
const ALERTS_TABLE = process.env.ALERTS_TABLE || 'MedTranslateAlerts';
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
 * Get system health status
 *
 * @returns {Promise<Object>} System health data
 */
async function getSystemHealth() {
  try {
    // Check backend API health
    const backendHealth = await checkComponentHealth('backend');

    // Check database health
    const databaseHealth = await checkComponentHealth('database');

    // Check edge devices health
    const edgeHealth = await checkComponentHealth('edge');

    // Check translation service health
    const translationHealth = await checkComponentHealth('translation');

    return {
      backend: backendHealth,
      database: databaseHealth,
      edge: edgeHealth,
      translation: translationHealth,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting system health:', error);
    throw error;
  }
}

/**
 * Check health of a specific component
 *
 * @param {string} component Component name
 * @returns {Promise<Object>} Component health data
 */
async function checkComponentHealth(component) {
  try {
    if (IS_OFFLINE) {
      // In development environment, return mock data
      console.log(`Using mock data for ${component} health check in development environment`);

      // Generate random values for testing
      const responseTime = Math.floor(Math.random() * 200) + 50; // 50-250ms
      const errorRate = Math.random() * 2; // 0-2%

      // Determine status based on metrics
      let status = 'healthy';

      if (errorRate > 1.5) {
        status = 'degraded';
      } else if (component === 'edge' && Math.random() > 0.7) {
        // Randomly make edge component degraded for testing
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        errorRate
      };
    }

    // In production, get CloudWatch metrics for the component
    const responseTimeParams = {
      MetricName: 'ResponseTime',
      Namespace: CLOUDWATCH_NAMESPACE,
      Dimensions: [
        {
          Name: 'Component',
          Value: component
        }
      ],
      StartTime: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      EndTime: new Date(),
      Period: 60, // 1 minute
      Statistics: ['Average']
    };

    const errorRateParams = {
      MetricName: 'ErrorRate',
      Namespace: CLOUDWATCH_NAMESPACE,
      Dimensions: [
        {
          Name: 'Component',
          Value: component
        }
      ],
      StartTime: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      EndTime: new Date(),
      Period: 60, // 1 minute
      Statistics: ['Average']
    };

    const [responseTimeData, errorRateData] = await Promise.all([
      cloudWatch.getMetricStatistics(responseTimeParams).promise(),
      cloudWatch.getMetricStatistics(errorRateParams).promise()
    ]);

    // Calculate average response time
    const responseTime = responseTimeData.Datapoints.length > 0
      ? Math.round(responseTimeData.Datapoints[0].Average)
      : 0;

    // Calculate error rate
    const errorRate = errorRateData.Datapoints.length > 0
      ? errorRateData.Datapoints[0].Average
      : 0;

    // Determine status based on metrics
    let status = 'healthy';

    if (errorRate > 5) {
      status = 'unhealthy';
    } else if (errorRate > 1 || responseTime > 1000) {
      status = 'degraded';
    }

    return {
      status,
      responseTime,
      errorRate
    };
  } catch (error) {
    console.error(`Error checking ${component} health:`, error);
    return {
      status: 'unknown',
      responseTime: 0,
      errorRate: 0
    };
  }
}

/**
 * Get performance metrics
 *
 * @param {Object} params Query parameters
 * @returns {Promise<Object>} Performance metrics data
 */
async function getPerformanceMetrics(params = {}) {
  try {
    const {
      startTime = new Date(Date.now() - 60 * 60 * 1000), // Last hour
      endTime = new Date(),
      period = 300 // 5 minutes
    } = params;

    if (IS_OFFLINE) {
      // In development environment, return mock data
      console.log('Using mock data for performance metrics in development environment');

      return generateMockPerformanceData(startTime, endTime, period);
    }

    // Get response time metrics
    const responseTimeData = await getMetricData(
      'ResponseTime',
      ['backend', 'database', 'translation', 'edge'],
      startTime,
      endTime,
      period
    );

    // Get CPU utilization metrics
    const cpuData = await getMetricData(
      'CPUUtilization',
      ['backend', 'database', 'translation'],
      startTime,
      endTime,
      period
    );

    // Get memory usage metrics
    const memoryData = await getMetricData(
      'MemoryUtilization',
      ['backend', 'database', 'translation'],
      startTime,
      endTime,
      period
    );

    // Get error rate metrics
    const errorRateData = await getMetricData(
      'ErrorRate',
      ['backend', 'database', 'translation', 'edge'],
      startTime,
      endTime,
      period
    );

    // Get request volume metrics
    const requestVolumeData = await getRequestVolumeData(
      startTime,
      endTime,
      period
    );

    return {
      responseTime: responseTimeData,
      cpu: cpuData,
      memory: memoryData,
      errorRate: errorRateData,
      requestVolume: requestVolumeData
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    throw error;
  }
}

/**
 * Generate mock performance data for development environment
 *
 * @param {Date} startTime Start time
 * @param {Date} endTime End time
 * @param {number} period Period in seconds
 * @returns {Object} Mock performance data
 */
function generateMockPerformanceData(startTime, endTime, period) {
  // Calculate number of data points
  const duration = endTime.getTime() - startTime.getTime();
  const numPoints = Math.ceil(duration / (period * 1000));

  // Generate time points
  const timePoints = [];
  for (let i = 0; i < numPoints; i++) {
    const time = new Date(startTime.getTime() + i * period * 1000);
    timePoints.push(time.toISOString());
  }

  // Generate response time data
  const responseTimeData = timePoints.map(time => {
    return {
      time,
      backend: Math.floor(Math.random() * 100) + 50,
      database: Math.floor(Math.random() * 150) + 100,
      translation: Math.floor(Math.random() * 200) + 150,
      edge: Math.floor(Math.random() * 250) + 200
    };
  });

  // Generate CPU utilization data
  const cpuData = timePoints.map(time => {
    return {
      time,
      backend: Math.floor(Math.random() * 30) + 10,
      database: Math.floor(Math.random() * 40) + 20,
      translation: Math.floor(Math.random() * 50) + 30
    };
  });

  // Generate memory usage data
  const memoryData = timePoints.map(time => {
    return {
      time,
      backend: Math.floor(Math.random() * 1000) + 500,
      database: Math.floor(Math.random() * 2000) + 1000,
      translation: Math.floor(Math.random() * 1500) + 800
    };
  });

  // Generate error rate data
  const errorRateData = timePoints.map(time => {
    return {
      time,
      backend: Math.random() * 2,
      database: Math.random() * 1,
      translation: Math.random() * 3,
      edge: Math.random() * 5
    };
  });

  // Generate request volume data
  const requestVolumeData = timePoints.map(time => {
    return {
      time,
      translations: Math.floor(Math.random() * 100) + 50,
      sessions: Math.floor(Math.random() * 20) + 5,
      users: Math.floor(Math.random() * 50) + 20
    };
  });

  return {
    responseTime: responseTimeData,
    cpu: cpuData,
    memory: memoryData,
    errorRate: errorRateData,
    requestVolume: requestVolumeData
  };
}

/**
 * Get metric data for multiple components
 *
 * @param {string} metricName Metric name
 * @param {Array<string>} components Component names
 * @param {Date} startTime Start time
 * @param {Date} endTime End time
 * @param {number} period Period in seconds
 * @returns {Promise<Array<Object>>} Metric data
 */
async function getMetricData(metricName, components, startTime, endTime, period) {
  try {
    const metricDataQueries = components.map((component, index) => ({
      Id: `m${index}`,
      MetricStat: {
        Metric: {
          Namespace: CLOUDWATCH_NAMESPACE,
          MetricName: metricName,
          Dimensions: [
            {
              Name: 'Component',
              Value: component
            }
          ]
        },
        Period: period,
        Stat: 'Average'
      },
      Label: component
    }));

    const params = {
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: metricDataQueries
    };

    const result = await cloudWatch.getMetricData(params).promise();

    // Format the data for charts
    const timestamps = result.MetricDataResults[0]?.Timestamps || [];

    return timestamps.map((timestamp, i) => {
      const dataPoint = {
        time: timestamp.toISOString()
      };

      result.MetricDataResults.forEach(metricData => {
        dataPoint[metricData.Label] = metricData.Values[i] || 0;
      });

      return dataPoint;
    }).sort((a, b) => new Date(a.time) - new Date(b.time));
  } catch (error) {
    console.error(`Error getting ${metricName} metrics:`, error);
    return [];
  }
}

/**
 * Get request volume data
 *
 * @param {Date} startTime Start time
 * @param {Date} endTime End time
 * @param {number} period Period in seconds
 * @returns {Promise<Array<Object>>} Request volume data
 */
async function getRequestVolumeData(startTime, endTime, period) {
  try {
    const metricDataQueries = [
      {
        Id: 'm1',
        MetricStat: {
          Metric: {
            Namespace: CLOUDWATCH_NAMESPACE,
            MetricName: 'TranslationCount',
            Dimensions: []
          },
          Period: period,
          Stat: 'Sum'
        },
        Label: 'translations'
      },
      {
        Id: 'm2',
        MetricStat: {
          Metric: {
            Namespace: CLOUDWATCH_NAMESPACE,
            MetricName: 'SessionCount',
            Dimensions: []
          },
          Period: period,
          Stat: 'Sum'
        },
        Label: 'sessions'
      },
      {
        Id: 'm3',
        MetricStat: {
          Metric: {
            Namespace: CLOUDWATCH_NAMESPACE,
            MetricName: 'UserCount',
            Dimensions: []
          },
          Period: period,
          Stat: 'Sum'
        },
        Label: 'users'
      }
    ];

    const params = {
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: metricDataQueries
    };

    const result = await cloudWatch.getMetricData(params).promise();

    // Format the data for charts
    const timestamps = result.MetricDataResults[0]?.Timestamps || [];

    return timestamps.map((timestamp, i) => {
      const dataPoint = {
        time: timestamp.toISOString()
      };

      result.MetricDataResults.forEach(metricData => {
        dataPoint[metricData.Label] = metricData.Values[i] || 0;
      });

      return dataPoint;
    }).sort((a, b) => new Date(a.time) - new Date(b.time));
  } catch (error) {
    console.error('Error getting request volume metrics:', error);
    return [];
  }
}

/**
 * Get resource utilization data
 *
 * @returns {Promise<Object>} Resource utilization data
 */
async function getResourceUtilization() {
  try {
    if (IS_OFFLINE) {
      // In development environment, return mock data
      console.log('Using mock data for resource utilization in development environment');

      return generateMockResourceUtilization();
    }

    // Get Lambda function metrics
    const lambdaData = await getLambdaMetrics();

    // Get DynamoDB table metrics
    const dynamoDBData = await getDynamoDBMetrics();

    // Get S3 bucket metrics
    const s3Data = await getS3Metrics();

    // Get API Gateway metrics
    const apiGatewayData = await getAPIGatewayMetrics();

    return {
      lambda: lambdaData,
      dynamodb: dynamoDBData,
      s3: s3Data,
      apiGateway: apiGatewayData
    };
  } catch (error) {
    console.error('Error getting resource utilization:', error);
    throw error;
  }
}

/**
 * Generate mock resource utilization data for development environment
 *
 * @returns {Object} Mock resource utilization data
 */
function generateMockResourceUtilization() {
  // Generate Lambda function metrics
  const lambdaData = [
    { name: 'Authentication', invocations: 1245, errors: 12, throttles: 0 },
    { name: 'Translation', invocations: 5678, errors: 45, throttles: 2 },
    { name: 'Storage', invocations: 987, errors: 5, throttles: 0 },
    { name: 'WebSocket', invocations: 3456, errors: 23, throttles: 1 },
    { name: 'Monitoring', invocations: 567, errors: 3, throttles: 0 }
  ];

  // Generate DynamoDB table metrics
  const dynamoDBData = [
    { name: 'Users', readCapacity: 1200, writeCapacity: 450, throttles: 0 },
    { name: 'Sessions', readCapacity: 3500, writeCapacity: 1200, throttles: 5 },
    { name: 'Translations', readCapacity: 8900, writeCapacity: 4500, throttles: 12 },
    { name: 'Alerts', readCapacity: 350, writeCapacity: 120, throttles: 0 }
  ];

  // Generate S3 bucket metrics
  const s3Data = [
    { name: 'audio', size: 12.5 },
    { name: 'transcripts', size: 3.2 },
    { name: 'logs', size: 8.7 },
    { name: 'backups', size: 25.1 }
  ];

  // Generate API Gateway metrics
  const apiGatewayData = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const time = new Date(now);
    time.setHours(now.getHours() - 23 + i);

    apiGatewayData.push({
      time: time.toISOString(),
      requests: Math.floor(Math.random() * 200) + 100,
      errors: Math.floor(Math.random() * 10),
      latency: Math.floor(Math.random() * 150) + 50
    });
  }

  return {
    lambda: lambdaData,
    dynamodb: dynamoDBData,
    s3: s3Data,
    apiGateway: apiGatewayData
  };
}

/**
 * Get Lambda function metrics
 *
 * @returns {Promise<Array<Object>>} Lambda function metrics
 */
async function getLambdaMetrics() {
  try {
    // Get list of Lambda functions
    const lambda = new AWS.Lambda();
    const functions = await lambda.listFunctions().promise();

    // Get metrics for each function
    const functionMetrics = await Promise.all(
      functions.Functions.filter(fn => fn.FunctionName.includes('MedTranslate'))
        .map(async (fn) => {
          const invocationsParams = {
            MetricName: 'Invocations',
            Namespace: 'AWS/Lambda',
            Dimensions: [
              {
                Name: 'FunctionName',
                Value: fn.FunctionName
              }
            ],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            EndTime: new Date(),
            Period: 86400, // 1 day
            Statistics: ['Sum']
          };

          const errorsParams = {
            MetricName: 'Errors',
            Namespace: 'AWS/Lambda',
            Dimensions: [
              {
                Name: 'FunctionName',
                Value: fn.FunctionName
              }
            ],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            EndTime: new Date(),
            Period: 86400, // 1 day
            Statistics: ['Sum']
          };

          const throttlesParams = {
            MetricName: 'Throttles',
            Namespace: 'AWS/Lambda',
            Dimensions: [
              {
                Name: 'FunctionName',
                Value: fn.FunctionName
              }
            ],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            EndTime: new Date(),
            Period: 86400, // 1 day
            Statistics: ['Sum']
          };

          const [invocationsData, errorsData, throttlesData] = await Promise.all([
            cloudWatch.getMetricStatistics(invocationsParams).promise(),
            cloudWatch.getMetricStatistics(errorsParams).promise(),
            cloudWatch.getMetricStatistics(throttlesParams).promise()
          ]);

          return {
            name: fn.FunctionName.replace('MedTranslate-', ''),
            invocations: invocationsData.Datapoints.length > 0 ? invocationsData.Datapoints[0].Sum : 0,
            errors: errorsData.Datapoints.length > 0 ? errorsData.Datapoints[0].Sum : 0,
            throttles: throttlesData.Datapoints.length > 0 ? throttlesData.Datapoints[0].Sum : 0
          };
        })
    );

    return functionMetrics;
  } catch (error) {
    console.error('Error getting Lambda metrics:', error);
    return [];
  }
}

/**
 * Get DynamoDB table metrics
 *
 * @returns {Promise<Array<Object>>} DynamoDB table metrics
 */
async function getDynamoDBMetrics() {
  try {
    // Get list of DynamoDB tables
    const dynamoDBClient = new AWS.DynamoDB();
    const tables = await dynamoDBClient.listTables().promise();

    // Get metrics for each table
    const tableMetrics = await Promise.all(
      tables.TableNames.filter(tableName => tableName.includes('MedTranslate'))
        .map(async (tableName) => {
          const readCapacityParams = {
            MetricName: 'ConsumedReadCapacityUnits',
            Namespace: 'AWS/DynamoDB',
            Dimensions: [
              {
                Name: 'TableName',
                Value: tableName
              }
            ],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            EndTime: new Date(),
            Period: 86400, // 1 day
            Statistics: ['Sum']
          };

          const writeCapacityParams = {
            MetricName: 'ConsumedWriteCapacityUnits',
            Namespace: 'AWS/DynamoDB',
            Dimensions: [
              {
                Name: 'TableName',
                Value: tableName
              }
            ],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            EndTime: new Date(),
            Period: 86400, // 1 day
            Statistics: ['Sum']
          };

          const throttlesParams = {
            MetricName: 'ThrottledRequests',
            Namespace: 'AWS/DynamoDB',
            Dimensions: [
              {
                Name: 'TableName',
                Value: tableName
              }
            ],
            StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            EndTime: new Date(),
            Period: 86400, // 1 day
            Statistics: ['Sum']
          };

          const [readCapacityData, writeCapacityData, throttlesData] = await Promise.all([
            cloudWatch.getMetricStatistics(readCapacityParams).promise(),
            cloudWatch.getMetricStatistics(writeCapacityParams).promise(),
            cloudWatch.getMetricStatistics(throttlesParams).promise()
          ]);

          return {
            name: tableName.replace('MedTranslate', ''),
            readCapacity: readCapacityData.Datapoints.length > 0 ? Math.round(readCapacityData.Datapoints[0].Sum) : 0,
            writeCapacity: writeCapacityData.Datapoints.length > 0 ? Math.round(writeCapacityData.Datapoints[0].Sum) : 0,
            throttles: throttlesData.Datapoints.length > 0 ? Math.round(throttlesData.Datapoints[0].Sum) : 0
          };
        })
    );

    return tableMetrics;
  } catch (error) {
    console.error('Error getting DynamoDB metrics:', error);
    return [];
  }
}

/**
 * Get S3 bucket metrics
 *
 * @returns {Promise<Array<Object>>} S3 bucket metrics
 */
async function getS3Metrics() {
  try {
    // Get list of S3 buckets
    const s3 = new AWS.S3();
    const buckets = await s3.listBuckets().promise();

    // Get metrics for each bucket
    const bucketMetrics = await Promise.all(
      buckets.Buckets.filter(bucket => bucket.Name.includes('medtranslate'))
        .map(async (bucket) => {
          try {
            // Get bucket size
            const sizeParams = {
              MetricName: 'BucketSizeBytes',
              Namespace: 'AWS/S3',
              Dimensions: [
                {
                  Name: 'BucketName',
                  Value: bucket.Name
                },
                {
                  Name: 'StorageType',
                  Value: 'StandardStorage'
                }
              ],
              StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              EndTime: new Date(),
              Period: 86400, // 1 day
              Statistics: ['Average']
            };

            const sizeData = await cloudWatch.getMetricStatistics(sizeParams).promise();

            // Convert bytes to GB
            const sizeGB = sizeData.Datapoints.length > 0
              ? Math.round(sizeData.Datapoints[0].Average / (1024 * 1024 * 1024) * 100) / 100
              : 0;

            return {
              name: bucket.Name.replace('medtranslate-', ''),
              size: sizeGB
            };
          } catch (error) {
            console.error(`Error getting metrics for bucket ${bucket.Name}:`, error);
            return {
              name: bucket.Name.replace('medtranslate-', ''),
              size: 0
            };
          }
        })
    );

    return bucketMetrics;
  } catch (error) {
    console.error('Error getting S3 metrics:', error);
    return [];
  }
}

/**
 * Get API Gateway metrics
 *
 * @returns {Promise<Array<Object>>} API Gateway metrics
 */
async function getAPIGatewayMetrics() {
  try {
    const startTime = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    const endTime = new Date();
    const period = 300; // 5 minutes

    const requestsParams = {
      MetricName: 'Count',
      Namespace: 'AWS/ApiGateway',
      Dimensions: [
        {
          Name: 'ApiName',
          Value: 'MedTranslateAPI'
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Statistics: ['Sum']
    };

    const errorsParams = {
      MetricName: '5XXError',
      Namespace: 'AWS/ApiGateway',
      Dimensions: [
        {
          Name: 'ApiName',
          Value: 'MedTranslateAPI'
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Statistics: ['Sum']
    };

    const latencyParams = {
      MetricName: 'Latency',
      Namespace: 'AWS/ApiGateway',
      Dimensions: [
        {
          Name: 'ApiName',
          Value: 'MedTranslateAPI'
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: period,
      Statistics: ['Average']
    };

    const [requestsData, errorsData, latencyData] = await Promise.all([
      cloudWatch.getMetricStatistics(requestsParams).promise(),
      cloudWatch.getMetricStatistics(errorsParams).promise(),
      cloudWatch.getMetricStatistics(latencyParams).promise()
    ]);

    // Format the data for charts
    const timestamps = new Set();

    requestsData.Datapoints.forEach(datapoint => timestamps.add(datapoint.Timestamp.toISOString()));
    errorsData.Datapoints.forEach(datapoint => timestamps.add(datapoint.Timestamp.toISOString()));
    latencyData.Datapoints.forEach(datapoint => timestamps.add(datapoint.Timestamp.toISOString()));

    const sortedTimestamps = Array.from(timestamps).sort();

    return sortedTimestamps.map(timestamp => {
      const requestsDatapoint = requestsData.Datapoints.find(d => d.Timestamp.toISOString() === timestamp);
      const errorsDatapoint = errorsData.Datapoints.find(d => d.Timestamp.toISOString() === timestamp);
      const latencyDatapoint = latencyData.Datapoints.find(d => d.Timestamp.toISOString() === timestamp);

      return {
        time: timestamp,
        requests: requestsDatapoint ? requestsDatapoint.Sum : 0,
        errors: errorsDatapoint ? errorsDatapoint.Sum : 0,
        latency: latencyDatapoint ? Math.round(latencyDatapoint.Average) : 0
      };
    });
  } catch (error) {
    console.error('Error getting API Gateway metrics:', error);
    return [];
  }
}

/**
 * Get system alerts
 *
 * @param {Object} params Query parameters
 * @returns {Promise<Array<Object>>} System alerts
 */
async function getSystemAlerts(params = {}) {
  try {
    if (IS_OFFLINE) {
      // In development environment, return mock data
      console.log('Using mock data for system alerts in development environment');

      return generateMockAlerts(params);
    }

    const {
      startDate,
      endDate,
      severity,
      component,
      status
    } = params;

    // Build query parameters
    const queryParams = {
      TableName: ALERTS_TABLE,
      ScanIndexForward: false // Sort in descending order (newest first)
    };

    // Add filter expression if needed
    const filterExpressions = [];
    const expressionAttributeValues = {};

    if (startDate) {
      filterExpressions.push('timestamp >= :startDate');
      expressionAttributeValues[':startDate'] = startDate;
    }

    if (endDate) {
      filterExpressions.push('timestamp <= :endDate');
      expressionAttributeValues[':endDate'] = endDate;
    }

    if (severity) {
      filterExpressions.push('severity = :severity');
      expressionAttributeValues[':severity'] = severity;
    }

    if (component) {
      filterExpressions.push('component = :component');
      expressionAttributeValues[':component'] = component;
    }

    if (status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = status;
      queryParams.ExpressionAttributeNames = {
        '#status': 'status'
      };
    }

    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
      queryParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    // Query alerts
    const result = await dynamoDB.scan(queryParams).promise();

    return result.Items || [];
  } catch (error) {
    console.error('Error getting system alerts:', error);
    throw error;
  }
}

/**
 * Generate mock alerts for development environment
 *
 * @param {Object} params Query parameters
 * @returns {Array<Object>} Mock alerts
 */
function generateMockAlerts(params = {}) {
  const {
    severity,
    component,
    status
  } = params;

  // Generate mock alerts
  const mockAlerts = [
    {
      alert_id: '1',
      severity: 'critical',
      component: 'database',
      message: 'Database connection timeout',
      details: { attempts: 3, lastError: 'Connection refused' },
      status: 'active',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      alert_id: '2',
      severity: 'warning',
      component: 'edge',
      message: 'Edge device offline',
      details: { deviceId: 'edge-003', location: 'Clinic C' },
      status: 'acknowledged',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    },
    {
      alert_id: '3',
      severity: 'info',
      component: 'translation',
      message: 'Translation service restarted',
      details: { reason: 'Scheduled maintenance' },
      status: 'resolved',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString()
    },
    {
      alert_id: '4',
      severity: 'warning',
      component: 'backend',
      message: 'High CPU usage',
      details: { usage: '85%', threshold: '80%' },
      status: 'active',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      alert_id: '5',
      severity: 'critical',
      component: 'translation',
      message: 'Translation service error rate high',
      details: { errorRate: '8.5%', threshold: '5%' },
      status: 'acknowledged',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    }
  ];

  // Apply filters
  let filteredAlerts = [...mockAlerts];

  if (severity) {
    filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
  }

  if (component) {
    filteredAlerts = filteredAlerts.filter(alert => alert.component === component);
  }

  if (status) {
    filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
  }

  return filteredAlerts;
}

/**
 * Create a system alert
 *
 * @param {Object} alertData Alert data
 * @returns {Promise<Object>} Created alert
 */
async function createSystemAlert(alertData) {
  try {
    const {
      severity,
      component,
      message,
      details
    } = alertData;

    // Validate required fields
    if (!severity || !component || !message) {
      throw new Error('Missing required fields: severity, component, message');
    }

    // Create alert record
    const alert = {
      alert_id: uuidv4(),
      severity,
      component,
      message,
      details: details || {},
      status: 'active',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to DynamoDB
    await dynamoDB.put({
      TableName: ALERTS_TABLE,
      Item: alert
    }).promise();

    return alert;
  } catch (error) {
    console.error('Error creating system alert:', error);
    throw error;
  }
}

/**
 * Update a system alert
 *
 * @param {string} alertId Alert ID
 * @param {Object} updateData Update data
 * @returns {Promise<Object>} Updated alert
 */
async function updateSystemAlert(alertId, updateData) {
  try {
    // Get existing alert
    const getResult = await dynamoDB.get({
      TableName: ALERTS_TABLE,
      Key: {
        alert_id: alertId
      }
    }).promise();

    if (!getResult.Item) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    const alert = getResult.Item;

    // Update fields
    const updatedAlert = {
      ...alert,
      ...updateData,
      updated_at: new Date().toISOString()
    };

    // Save to DynamoDB
    await dynamoDB.put({
      TableName: ALERTS_TABLE,
      Item: updatedAlert
    }).promise();

    return updatedAlert;
  } catch (error) {
    console.error('Error updating system alert:', error);
    throw error;
  }
}

module.exports = {
  getSystemHealth,
  getPerformanceMetrics,
  getResourceUtilization,
  getSystemAlerts,
  createSystemAlert,
  updateSystemAlert
};
