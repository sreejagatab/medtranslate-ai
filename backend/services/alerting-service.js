/**
 * Alerting Service for MedTranslate AI
 * 
 * This service provides functions for sending alerts for critical system issues.
 * It integrates with various notification channels like email, SMS, and Slack.
 */

// Import required modules
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Import config
const config = require('../config');

// Import CloudWatch service
const cloudWatchService = require('./cloudwatch-service');

// Initialize AWS SDK
const region = process.env.AWS_REGION || config.aws?.region || 'us-east-1';
const environment = process.env.NODE_ENV || 'development';

// AWS SNS client
let sns;

// Email transporter
let emailTransporter;

// Initialize AWS SNS
function initializeSNS() {
  // Check if SNS is already initialized
  if (sns) {
    return;
  }
  
  // Configure AWS SDK
  AWS.config.update({
    region,
    ...(process.env.NODE_ENV === 'development' && {
      // Use local credentials for development
      credentials: new AWS.SharedIniFileCredentials({ profile: 'medtranslate-ai' })
    })
  });
  
  // Create SNS client
  sns = new AWS.SNS();
}

// Initialize email transporter
function initializeEmailTransporter() {
  // Check if email transporter is already initialized
  if (emailTransporter) {
    return;
  }
  
  // Create email transporter
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || config.smtp?.host,
    port: process.env.SMTP_PORT || config.smtp?.port || 587,
    secure: process.env.SMTP_SECURE === 'true' || config.smtp?.secure || false,
    auth: {
      user: process.env.SMTP_USER || config.smtp?.user,
      pass: process.env.SMTP_PASS || config.smtp?.pass
    }
  });
}

/**
 * Send alert via email
 * 
 * @param {Object} options - Alert options
 * @returns {Promise<Object>} - Email response
 */
async function sendEmailAlert(options) {
  try {
    // Initialize email transporter if needed
    initializeEmailTransporter();
    
    // Skip in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_ALERTS) {
      console.log('Email alerts disabled in development mode');
      console.log('Alert options:', options);
      return;
    }
    
    // Check if email configuration is available
    if (!emailTransporter) {
      console.error('Email transporter not configured');
      return;
    }
    
    // Send email
    const response = await emailTransporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM || config.alerts?.email?.from || 'alerts@medtranslate-ai.com',
      to: options.to || process.env.ALERT_EMAIL_TO || config.alerts?.email?.to || 'admin@medtranslate-ai.com',
      subject: `[${environment.toUpperCase()}] ${options.subject}`,
      text: options.text,
      html: options.html
    });
    
    console.log(`Sent email alert: ${options.subject}`);
    
    return response;
  } catch (error) {
    console.error('Error sending email alert:', error);
    
    // Log alert options that failed to send
    console.log('Failed alert options:', options);
  }
}

/**
 * Send alert via SMS
 * 
 * @param {Object} options - Alert options
 * @returns {Promise<Object>} - SNS response
 */
async function sendSMSAlert(options) {
  try {
    // Initialize SNS if needed
    initializeSNS();
    
    // Skip in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_ALERTS) {
      console.log('SMS alerts disabled in development mode');
      console.log('Alert options:', options);
      return;
    }
    
    // Check if SNS is available
    if (!sns) {
      console.error('SNS not configured');
      return;
    }
    
    // Send SMS
    const response = await sns.publish({
      Message: `[${environment.toUpperCase()}] ${options.message}`,
      PhoneNumber: options.phoneNumber || process.env.ALERT_SMS_TO || config.alerts?.sms?.to
    }).promise();
    
    console.log(`Sent SMS alert: ${options.message}`);
    
    return response;
  } catch (error) {
    console.error('Error sending SMS alert:', error);
    
    // Log alert options that failed to send
    console.log('Failed alert options:', options);
  }
}

/**
 * Send alert via Slack
 * 
 * @param {Object} options - Alert options
 * @returns {Promise<Object>} - Slack response
 */
async function sendSlackAlert(options) {
  try {
    // Skip in development mode unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.ENABLE_ALERTS) {
      console.log('Slack alerts disabled in development mode');
      console.log('Alert options:', options);
      return;
    }
    
    // Check if Slack webhook URL is available
    const webhookUrl = options.webhookUrl || process.env.SLACK_WEBHOOK_URL || config.alerts?.slack?.webhookUrl;
    
    if (!webhookUrl) {
      console.error('Slack webhook URL not configured');
      return;
    }
    
    // Create Slack message
    const message = {
      text: `[${environment.toUpperCase()}] ${options.text}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `[${environment.toUpperCase()}] ${options.title || 'Alert'}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: options.text
          }
        }
      ]
    };
    
    // Add fields if available
    if (options.fields && options.fields.length > 0) {
      message.blocks.push({
        type: 'section',
        fields: options.fields.map(field => ({
          type: 'mrkdwn',
          text: `*${field.title}*\n${field.value}`
        }))
      });
    }
    
    // Add actions if available
    if (options.actions && options.actions.length > 0) {
      message.blocks.push({
        type: 'actions',
        elements: options.actions.map(action => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.text
          },
          url: action.url,
          style: action.style || 'primary'
        }))
      });
    }
    
    // Send Slack message
    const response = await axios.post(webhookUrl, message);
    
    console.log(`Sent Slack alert: ${options.title || 'Alert'}`);
    
    return response.data;
  } catch (error) {
    console.error('Error sending Slack alert:', error);
    
    // Log alert options that failed to send
    console.log('Failed alert options:', options);
  }
}

/**
 * Send system alert
 * 
 * @param {Object} options - Alert options
 * @returns {Promise<Object>} - Alert responses
 */
async function sendSystemAlert(options) {
  try {
    // Log alert to CloudWatch
    await cloudWatchService.sendLog(
      options.message || options.subject || options.title,
      options.data,
      options.level || 'error'
    );
    
    // Send alerts to all configured channels
    const responses = {};
    
    // Send email alert if enabled
    if (options.channels?.includes('email') || !options.channels) {
      responses.email = await sendEmailAlert({
        to: options.email?.to,
        subject: options.subject || options.title || 'System Alert',
        text: options.message || options.text,
        html: options.html
      });
    }
    
    // Send SMS alert if enabled
    if (options.channels?.includes('sms') || !options.channels) {
      responses.sms = await sendSMSAlert({
        phoneNumber: options.sms?.to,
        message: options.message || options.text
      });
    }
    
    // Send Slack alert if enabled
    if (options.channels?.includes('slack') || !options.channels) {
      responses.slack = await sendSlackAlert({
        webhookUrl: options.slack?.webhookUrl,
        title: options.title || options.subject || 'System Alert',
        text: options.message || options.text,
        fields: options.fields,
        actions: options.actions
      });
    }
    
    return responses;
  } catch (error) {
    console.error('Error sending system alert:', error);
    
    // Log alert options that failed to send
    console.log('Failed alert options:', options);
  }
}

/**
 * Send component error alert
 * 
 * @param {string} component - Component name
 * @param {string} status - Component status
 * @param {Object} details - Component details
 * @returns {Promise<Object>} - Alert responses
 */
async function sendComponentErrorAlert(component, status, details) {
  try {
    // Create alert options
    const options = {
      title: `Component Error: ${component}`,
      message: `The ${component} component is reporting a status of ${status}.`,
      level: status === 'degraded' ? 'warn' : 'error',
      data: {
        component,
        status,
        details
      },
      fields: [
        {
          title: 'Component',
          value: component
        },
        {
          title: 'Status',
          value: status
        },
        {
          title: 'Environment',
          value: environment
        }
      ],
      actions: [
        {
          text: 'View Dashboard',
          url: `https://${environment === 'production' ? 'app' : environment}.medtranslate-ai.com/admin/monitoring`
        }
      ]
    };
    
    // Add error details if available
    if (details?.error) {
      options.fields.push({
        title: 'Error',
        value: details.error
      });
    }
    
    // Add warnings if available
    if (details?.warnings && details.warnings.length > 0) {
      options.fields.push({
        title: 'Warnings',
        value: details.warnings.join('\n')
      });
    }
    
    // Send system alert
    return await sendSystemAlert(options);
  } catch (error) {
    console.error('Error sending component error alert:', error);
  }
}

// Export functions
module.exports = {
  sendEmailAlert,
  sendSMSAlert,
  sendSlackAlert,
  sendSystemAlert,
  sendComponentErrorAlert
};
