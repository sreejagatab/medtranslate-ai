/**
 * Analytics Service for MedTranslate AI
 * 
 * This service provides comprehensive analytics tracking and reporting
 * for the MedTranslate AI platform.
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatch();

// Table names
const EVENTS_TABLE = process.env.ANALYTICS_EVENTS_TABLE || 'MedTranslateAnalyticsEvents';
const METRICS_TABLE = process.env.ANALYTICS_METRICS_TABLE || 'MedTranslateAnalyticsMetrics';

// Event types
const EVENT_TYPES = {
  SESSION_CREATED: 'session_created',
  SESSION_JOINED: 'session_joined',
  SESSION_ENDED: 'session_ended',
  TRANSLATION_REQUESTED: 'translation_requested',
  TRANSLATION_COMPLETED: 'translation_completed',
  TRANSLATION_FAILED: 'translation_failed',
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  ERROR: 'error',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  FEATURE_USED: 'feature_used',
  OFFLINE_TRANSLATION: 'offline_translation',
  SYNC_COMPLETED: 'sync_completed'
};

/**
 * Track an analytics event
 * 
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event data
 * @param {string} userId - User ID (optional)
 * @param {string} sessionId - Session ID (optional)
 * @returns {Promise<Object>} - Event record
 */
async function trackEvent(eventType, eventData = {}, userId = null, sessionId = null) {
  try {
    // Skip tracking in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Analytics event tracked: ${eventType}`, eventData);
      return { eventId: 'dev-event-id' };
    }
    
    // Create event record
    const timestamp = new Date().toISOString();
    const eventId = uuidv4();
    
    const event = {
      eventId,
      eventType,
      timestamp,
      userId,
      sessionId,
      data: eventData,
      source: eventData.source || 'backend'
    };
    
    // Store event in DynamoDB
    await dynamoDB.put({
      TableName: EVENTS_TABLE,
      Item: event
    }).promise();
    
    // Publish metric to CloudWatch
    await publishMetric(eventType, 1, {
      UserId: userId || 'anonymous',
      SessionId: sessionId || 'none',
      Source: eventData.source || 'backend'
    });
    
    return { eventId };
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    // Don't throw error to avoid disrupting application flow
    return { error: error.message };
  }
}

/**
 * Publish a metric to CloudWatch
 * 
 * @param {string} metricName - Metric name
 * @param {number} value - Metric value
 * @param {Object} dimensions - Metric dimensions
 * @returns {Promise<Object>} - CloudWatch response
 */
async function publishMetric(metricName, value = 1, dimensions = {}) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Metric published: ${metricName}=${value}`, dimensions);
      return { metricId: 'dev-metric-id' };
    }
    
    // Convert dimensions to CloudWatch format
    const metricDimensions = Object.entries(dimensions).map(([name, value]) => ({
      Name: name,
      Value: String(value)
    }));
    
    // Publish metric
    const params = {
      MetricData: [
        {
          MetricName: metricName,
          Dimensions: metricDimensions,
          Unit: 'Count',
          Value: value,
          Timestamp: new Date()
        }
      ],
      Namespace: 'MedTranslateAI'
    };
    
    await cloudWatch.putMetricData(params).promise();
    
    return { success: true };
  } catch (error) {
    console.error('Error publishing metric:', error);
    return { error: error.message };
  }
}

/**
 * Track a translation event
 * 
 * @param {Object} translation - Translation data
 * @param {string} status - Translation status
 * @param {string} userId - User ID (optional)
 * @param {string} sessionId - Session ID (optional)
 * @returns {Promise<Object>} - Event record
 */
async function trackTranslation(translation, status = 'completed', userId = null, sessionId = null) {
  try {
    const eventType = status === 'completed' 
      ? EVENT_TYPES.TRANSLATION_COMPLETED 
      : (status === 'failed' ? EVENT_TYPES.TRANSLATION_FAILED : EVENT_TYPES.TRANSLATION_REQUESTED);
    
    const eventData = {
      translationId: translation.translationId || uuidv4(),
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      sourceTextLength: translation.sourceText ? translation.sourceText.length : 0,
      translatedTextLength: translation.translatedText ? translation.translatedText.length : 0,
      medicalContext: translation.medicalContext || 'general',
      modelUsed: translation.modelUsed || 'unknown',
      confidence: translation.confidence || 'unknown',
      processingTime: translation.processingTime || 0,
      isOffline: translation.isOffline || false,
      status
    };
    
    return await trackEvent(eventType, eventData, userId, sessionId);
  } catch (error) {
    console.error('Error tracking translation event:', error);
    return { error: error.message };
  }
}

/**
 * Track a session event
 * 
 * @param {string} action - Session action (created, joined, ended)
 * @param {Object} sessionData - Session data
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} - Event record
 */
async function trackSession(action, sessionData, userId = null) {
  try {
    let eventType;
    
    switch (action) {
      case 'created':
        eventType = EVENT_TYPES.SESSION_CREATED;
        break;
      case 'joined':
        eventType = EVENT_TYPES.SESSION_JOINED;
        break;
      case 'ended':
        eventType = EVENT_TYPES.SESSION_ENDED;
        break;
      default:
        eventType = EVENT_TYPES.SESSION_CREATED;
    }
    
    const eventData = {
      sessionId: sessionData.sessionId,
      providerId: sessionData.providerId,
      patientId: sessionData.patientId,
      sourceLanguage: sessionData.sourceLanguage,
      targetLanguage: sessionData.targetLanguage,
      deviceType: sessionData.deviceType || 'unknown',
      platform: sessionData.platform || 'unknown',
      duration: sessionData.duration || 0
    };
    
    return await trackEvent(eventType, eventData, userId, sessionData.sessionId);
  } catch (error) {
    console.error('Error tracking session event:', error);
    return { error: error.message };
  }
}

/**
 * Track an error event
 * 
 * @param {Error} error - Error object
 * @param {string} context - Error context
 * @param {string} userId - User ID (optional)
 * @param {string} sessionId - Session ID (optional)
 * @returns {Promise<Object>} - Event record
 */
async function trackError(error, context, userId = null, sessionId = null) {
  try {
    const eventData = {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      severity: error.severity || 'error'
    };
    
    return await trackEvent(EVENT_TYPES.ERROR, eventData, userId, sessionId);
  } catch (trackError) {
    console.error('Error tracking error event:', trackError);
    return { error: trackError.message };
  }
}

/**
 * Track user feedback
 * 
 * @param {Object} feedback - Feedback data
 * @param {string} userId - User ID (optional)
 * @param {string} sessionId - Session ID (optional)
 * @returns {Promise<Object>} - Event record
 */
async function trackFeedback(feedback, userId = null, sessionId = null) {
  try {
    const eventData = {
      feedbackId: feedback.feedbackId || uuidv4(),
      rating: feedback.rating,
      comments: feedback.comments,
      category: feedback.category || 'general',
      source: feedback.source || 'app'
    };
    
    return await trackEvent(EVENT_TYPES.FEEDBACK_SUBMITTED, eventData, userId, sessionId);
  } catch (error) {
    console.error('Error tracking feedback event:', error);
    return { error: error.message };
  }
}

/**
 * Get analytics data for a specific time range
 * 
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @param {Object} filters - Filters to apply
 * @returns {Promise<Object>} - Analytics data
 */
async function getAnalyticsData(startDate, endDate, filters = {}) {
  try {
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') {
      return generateMockAnalyticsData(startDate, endDate, filters);
    }
    
    // Query parameters
    const params = {
      TableName: EVENTS_TABLE,
      FilterExpression: 'timestamp BETWEEN :startDate AND :endDate',
      ExpressionAttributeValues: {
        ':startDate': startDate,
        ':endDate': endDate
      }
    };
    
    // Add filters
    let filterExpression = 'timestamp BETWEEN :startDate AND :endDate';
    
    if (filters.eventType) {
      filterExpression += ' AND eventType = :eventType';
      params.ExpressionAttributeValues[':eventType'] = filters.eventType;
    }
    
    if (filters.userId) {
      filterExpression += ' AND userId = :userId';
      params.ExpressionAttributeValues[':userId'] = filters.userId;
    }
    
    if (filters.sessionId) {
      filterExpression += ' AND sessionId = :sessionId';
      params.ExpressionAttributeValues[':sessionId'] = filters.sessionId;
    }
    
    params.FilterExpression = filterExpression;
    
    // Query DynamoDB
    const result = await dynamoDB.scan(params).promise();
    
    // Process results
    const events = result.Items || [];
    
    // Aggregate data
    const aggregatedData = aggregateAnalyticsData(events);
    
    return {
      events,
      aggregatedData,
      totalCount: events.length,
      period: {
        startDate,
        endDate
      }
    };
  } catch (error) {
    console.error('Error getting analytics data:', error);
    throw error;
  }
}

/**
 * Aggregate analytics data
 * 
 * @param {Array} events - Analytics events
 * @returns {Object} - Aggregated data
 */
function aggregateAnalyticsData(events) {
  // Count events by type
  const eventCounts = {};
  events.forEach(event => {
    eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
  });
  
  // Count translations by language pair
  const languagePairs = {};
  const translationEvents = events.filter(event => 
    event.eventType === EVENT_TYPES.TRANSLATION_COMPLETED || 
    event.eventType === EVENT_TYPES.TRANSLATION_REQUESTED
  );
  
  translationEvents.forEach(event => {
    const pair = `${event.data.sourceLanguage}-${event.data.targetLanguage}`;
    languagePairs[pair] = (languagePairs[pair] || 0) + 1;
  });
  
  // Calculate average translation time
  const completedTranslations = events.filter(event => 
    event.eventType === EVENT_TYPES.TRANSLATION_COMPLETED && 
    event.data.processingTime
  );
  
  let avgTranslationTime = 0;
  if (completedTranslations.length > 0) {
    const totalTime = completedTranslations.reduce((sum, event) => 
      sum + event.data.processingTime, 0
    );
    avgTranslationTime = totalTime / completedTranslations.length;
  }
  
  // Count sessions
  const sessions = new Set();
  events.forEach(event => {
    if (event.sessionId) {
      sessions.add(event.sessionId);
    }
  });
  
  // Count users
  const users = new Set();
  events.forEach(event => {
    if (event.userId) {
      users.add(event.userId);
    }
  });
  
  // Count errors
  const errors = events.filter(event => event.eventType === EVENT_TYPES.ERROR);
  
  return {
    eventCounts,
    languagePairs,
    avgTranslationTime,
    sessionCount: sessions.size,
    userCount: users.size,
    errorCount: errors.length
  };
}

/**
 * Generate mock analytics data for development
 * 
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {Object} filters - Filters
 * @returns {Object} - Mock analytics data
 */
function generateMockAnalyticsData(startDate, endDate, filters = {}) {
  // Generate random events
  const events = [];
  const eventTypes = Object.values(EVENT_TYPES);
  const languages = ['en', 'es', 'fr', 'de', 'zh', 'ar', 'ru'];
  
  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  
  // Generate events for each day
  for (let i = 0; i < daysDiff; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    
    // Generate random number of events for this day
    const eventCount = Math.floor(Math.random() * 50) + 10;
    
    for (let j = 0; j < eventCount; j++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const userId = `user-${Math.floor(Math.random() * 100)}`;
      const sessionId = `session-${Math.floor(Math.random() * 50)}`;
      
      // Generate event data based on type
      let eventData = {};
      
      if (eventType.includes('translation')) {
        const sourceLanguage = languages[Math.floor(Math.random() * languages.length)];
        let targetLanguage = languages[Math.floor(Math.random() * languages.length)];
        
        // Ensure target language is different from source
        while (targetLanguage === sourceLanguage) {
          targetLanguage = languages[Math.floor(Math.random() * languages.length)];
        }
        
        eventData = {
          translationId: `trans-${Math.floor(Math.random() * 1000)}`,
          sourceLanguage,
          targetLanguage,
          sourceTextLength: Math.floor(Math.random() * 500) + 10,
          translatedTextLength: Math.floor(Math.random() * 600) + 10,
          medicalContext: ['general', 'cardiology', 'neurology'][Math.floor(Math.random() * 3)],
          modelUsed: ['claude', 'titan', 'llama'][Math.floor(Math.random() * 3)],
          confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
          processingTime: Math.floor(Math.random() * 5000) + 100,
          isOffline: Math.random() > 0.8
        };
      } else if (eventType.includes('session')) {
        eventData = {
          sessionId,
          providerId: `provider-${Math.floor(Math.random() * 20)}`,
          patientId: `patient-${Math.floor(Math.random() * 50)}`,
          sourceLanguage: languages[Math.floor(Math.random() * languages.length)],
          targetLanguage: languages[Math.floor(Math.random() * languages.length)],
          deviceType: ['mobile', 'tablet', 'desktop'][Math.floor(Math.random() * 3)],
          platform: ['ios', 'android', 'web'][Math.floor(Math.random() * 3)],
          duration: Math.floor(Math.random() * 3600) + 60
        };
      }
      
      // Create event
      const timestamp = new Date(day);
      timestamp.setHours(Math.floor(Math.random() * 24));
      timestamp.setMinutes(Math.floor(Math.random() * 60));
      
      const event = {
        eventId: `event-${Math.floor(Math.random() * 10000)}`,
        eventType,
        timestamp: timestamp.toISOString(),
        userId,
        sessionId,
        data: eventData,
        source: ['backend', 'web', 'mobile'][Math.floor(Math.random() * 3)]
      };
      
      // Apply filters
      let includeEvent = true;
      
      if (filters.eventType && event.eventType !== filters.eventType) {
        includeEvent = false;
      }
      
      if (filters.userId && event.userId !== filters.userId) {
        includeEvent = false;
      }
      
      if (filters.sessionId && event.sessionId !== filters.sessionId) {
        includeEvent = false;
      }
      
      if (includeEvent) {
        events.push(event);
      }
    }
  }
  
  // Aggregate data
  const aggregatedData = aggregateAnalyticsData(events);
  
  return {
    events,
    aggregatedData,
    totalCount: events.length,
    period: {
      startDate,
      endDate
    },
    isMockData: true
  };
}

module.exports = {
  trackEvent,
  trackTranslation,
  trackSession,
  trackError,
  trackFeedback,
  getAnalyticsData,
  EVENT_TYPES
};
