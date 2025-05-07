/**
 * Device Fingerprinting Utility for MedTranslate AI
 *
 * This module provides functions for identifying and fingerprinting client devices
 * to enhance security and session management.
 */

const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

/**
 * Get client information from request
 * 
 * @param {Object} req - Express request object
 * @returns {Object} - Client information
 */
function getClientInfo(req) {
  try {
    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();
    
    // Get IP address
    const ip = getClientIp(req);
    
    // Get geo location from IP
    const geo = ip ? geoip.lookup(ip) : null;
    
    // Get client hints if available (modern browsers)
    const clientHints = {
      platform: req.headers['sec-ch-ua-platform'],
      mobile: req.headers['sec-ch-ua-mobile'] === '?1',
      model: req.headers['sec-ch-ua-model']
    };
    
    // Get screen information if available
    const screenInfo = {};
    if (req.headers['sec-ch-viewport-width'] && req.headers['sec-ch-viewport-height']) {
      screenInfo.screenResolution = `${req.headers['sec-ch-viewport-width']}x${req.headers['sec-ch-viewport-height']}`;
    }
    
    // Determine device type
    let deviceType = 'unknown';
    if (uaResult.device.type) {
      deviceType = uaResult.device.type;
    } else if (clientHints.mobile) {
      deviceType = 'mobile';
    } else if (userAgent.toLowerCase().includes('tablet')) {
      deviceType = 'tablet';
    } else if (userAgent.toLowerCase().includes('mobile')) {
      deviceType = 'mobile';
    } else {
      deviceType = 'desktop';
    }
    
    // Build client info object
    const clientInfo = {
      userAgent,
      ip,
      deviceType,
      os: uaResult.os.name ? `${uaResult.os.name} ${uaResult.os.version}` : 'unknown',
      browser: uaResult.browser.name ? `${uaResult.browser.name} ${uaResult.browser.version}` : 'unknown',
      device: uaResult.device.vendor ? `${uaResult.device.vendor} ${uaResult.device.model}` : clientHints.model || 'unknown',
      screenResolution: screenInfo.screenResolution || null,
      colorDepth: req.headers['sec-ch-color-depth'] || null,
      timezone: req.headers['sec-ch-timezone'] || null,
      language: req.headers['accept-language'] || null
    };
    
    // Add location information if available
    if (geo) {
      clientInfo.location = {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone
      };
    }
    
    return clientInfo;
  } catch (error) {
    console.error('Error getting client info:', error);
    return {
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIp(req) || 'unknown',
      deviceType: 'unknown'
    };
  }
}

/**
 * Get client IP address from request
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} - Client IP address
 */
function getClientIp(req) {
  // Check various headers for forwarded IP
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Get the first IP in the list
    return forwardedFor.split(',')[0].trim();
  }
  
  // Check other common headers
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // Fall back to request IP
  return req.ip || req.connection.remoteAddress || null;
}

/**
 * Compare two device fingerprints for similarity
 * 
 * @param {Object} fingerprint1 - First fingerprint
 * @param {Object} fingerprint2 - Second fingerprint
 * @returns {Object} - Comparison result
 */
function compareFingerprints(fingerprint1, fingerprint2) {
  // Calculate similarity score between fingerprints
  let matchCount = 0;
  let totalAttributes = 0;
  
  // Compare each attribute
  for (const key in fingerprint1) {
    if (fingerprint1[key] && fingerprint2[key]) {
      totalAttributes++;
      
      if (fingerprint1[key] === fingerprint2[key]) {
        matchCount++;
      }
    }
  }
  
  const similarityScore = totalAttributes > 0 ? matchCount / totalAttributes : 0;
  
  // Determine if it's likely the same device
  const isSameDevice = similarityScore >= 0.7;
  
  return {
    similarityScore,
    isSameDevice,
    matchCount,
    totalAttributes
  };
}

/**
 * Detect suspicious device characteristics
 * 
 * @param {Object} clientInfo - Client information
 * @returns {Object} - Suspicious characteristics
 */
function detectSuspiciousCharacteristics(clientInfo) {
  const suspicious = [];
  
  // Check for headless browsers
  if (clientInfo.userAgent.includes('HeadlessChrome') || 
      clientInfo.userAgent.includes('PhantomJS')) {
    suspicious.push('headless_browser');
  }
  
  // Check for automation tools
  if (clientInfo.userAgent.includes('Selenium') || 
      clientInfo.userAgent.includes('WebDriver') ||
      clientInfo.userAgent.includes('Puppeteer')) {
    suspicious.push('automation_tool');
  }
  
  // Check for inconsistent platform information
  if (clientInfo.os.includes('Windows') && clientInfo.userAgent.includes('Macintosh')) {
    suspicious.push('os_mismatch');
  }
  
  // Check for missing expected headers
  if (!clientInfo.language) {
    suspicious.push('missing_language');
  }
  
  return {
    hasSuspiciousCharacteristics: suspicious.length > 0,
    suspiciousCharacteristics: suspicious
  };
}

module.exports = {
  getClientInfo,
  getClientIp,
  compareFingerprints,
  detectSuspiciousCharacteristics
};
