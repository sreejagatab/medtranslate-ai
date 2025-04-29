/**
 * Health Service for MedTranslate AI
 * 
 * This service provides functions for checking the health of various system components.
 */

/**
 * Check the health of an API endpoint
 * 
 * @param {string} endpoint - API endpoint to check
 * @param {Object} options - Options for the health check
 * @param {number} options.timeout - Timeout in milliseconds
 * @param {Object} options.headers - Additional headers to include
 * @returns {Promise<Object>} Health check result
 */
export const checkApiHealth = async (endpoint, options = {}) => {
  const { timeout = 5000, headers = {} } = options;
  
  try {
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(timeout),
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let status = 'healthy';
    if (!response.ok) {
      status = 'error';
    } else if (responseTime > 1000) {
      status = 'warning';
    }
    
    return {
      status,
      responseTime,
      timestamp: new Date().toISOString(),
      endpoint,
      statusCode: response.status,
      statusText: response.statusText,
      error: null,
    };
  } catch (error) {
    return {
      status: 'error',
      responseTime: null,
      timestamp: new Date().toISOString(),
      endpoint,
      statusCode: null,
      statusText: null,
      error: error.message || 'Unknown error',
    };
  }
};

/**
 * Check the health of multiple API endpoints
 * 
 * @param {Array<Object>} endpoints - Array of endpoint objects
 * @param {string} endpoints[].url - Endpoint URL
 * @param {string} endpoints[].name - Endpoint name
 * @param {Object} endpoints[].options - Options for the health check
 * @returns {Promise<Object>} Health check results
 */
export const checkSystemHealth = async (endpoints) => {
  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      const result = await checkApiHealth(endpoint.url, endpoint.options);
      return {
        name: endpoint.name,
        ...result,
      };
    })
  );
  
  // Determine overall system health
  const hasError = results.some((result) => result.status === 'error');
  const hasWarning = results.some((result) => result.status === 'warning');
  
  let overallStatus = 'healthy';
  if (hasError) {
    overallStatus = 'error';
  } else if (hasWarning) {
    overallStatus = 'warning';
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    components: results,
  };
};

/**
 * Check the health of the edge device
 * 
 * @param {string} edgeUrl - Edge device URL
 * @param {Object} options - Options for the health check
 * @returns {Promise<Object>} Health check result
 */
export const checkEdgeHealth = async (edgeUrl, options = {}) => {
  try {
    const result = await checkApiHealth(`${edgeUrl}/health`, options);
    
    // If the health check was successful, get more detailed information
    if (result.status !== 'error') {
      try {
        const response = await fetch(`${edgeUrl}/network/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          signal: AbortSignal.timeout(options.timeout || 5000),
        });
        
        if (response.ok) {
          const networkStatus = await response.json();
          return {
            ...result,
            networkStatus,
          };
        }
      } catch (error) {
        // If we can't get network status, just return the basic health check
        console.warn('Failed to get edge network status:', error);
      }
    }
    
    return result;
  } catch (error) {
    return {
      status: 'error',
      responseTime: null,
      timestamp: new Date().toISOString(),
      endpoint: `${edgeUrl}/health`,
      statusCode: null,
      statusText: null,
      error: error.message || 'Unknown error',
    };
  }
};

export default {
  checkApiHealth,
  checkSystemHealth,
  checkEdgeHealth,
};
