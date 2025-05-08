/**
 * ML Model Testing Framework for MedTranslate AI
 * 
 * This framework provides utilities for testing ML models used in the system.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3005',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:3006',
  authToken: process.env.AUTH_TOKEN,
  testDataDir: process.env.ML_TEST_DATA_DIR || path.join(__dirname, '../test-data/ml'),
  reportDir: process.env.ML_REPORT_DIR || path.join(__dirname, '../../test-reports/ml')
};

// Create directories if they don't exist
for (const dir of [config.testDataDir, config.reportDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * ML Model Testing class
 */
class MLModelTesting {
  /**
   * Constructor
   * 
   * @param {Object} options - Testing options
   */
  constructor(options = {}) {
    this.options = {
      ...options,
      testId: options.testId || uuidv4().split('-')[0],
      testDataDir: options.testDataDir || config.testDataDir,
      reportDir: options.reportDir || config.reportDir,
      apiUrl: options.apiUrl || config.apiUrl,
      edgeUrl: options.edgeUrl || config.edgeUrl
    };
    
    this.testResults = {
      testId: this.options.testId,
      timestamp: new Date().toISOString(),
      models: []
    };
  }
  
  /**
   * Get authentication token
   * 
   * @returns {Promise<string>} - Authentication token
   */
  async getAuthToken() {
    if (config.authToken) {
      return config.authToken;
    }
    
    try {
      const response = await axios.post(`${this.options.apiUrl}/api/auth/login`, {
        email: 'test.provider@example.com',
        password: 'TestPassword123!'
      });
      
      return response.data.token;
    } catch (error) {
      console.error('Error getting auth token:', error.message);
      throw error;
    }
  }
  
  /**
   * Load test dataset
   * 
   * @param {string} datasetName - Dataset name
   * @returns {Promise<Object>} - Test dataset
   */
  async loadTestDataset(datasetName) {
    const datasetPath = path.join(this.options.testDataDir, `${datasetName}.json`);
    
    if (!fs.existsSync(datasetPath)) {
      throw new Error(`Test dataset not found: ${datasetName}`);
    }
    
    try {
      const datasetContent = fs.readFileSync(datasetPath, 'utf8');
      return JSON.parse(datasetContent);
    } catch (error) {
      console.error(`Error loading test dataset: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Save test dataset
   * 
   * @param {string} datasetName - Dataset name
   * @param {Object} dataset - Test dataset
   * @returns {Promise<string>} - Path to saved dataset
   */
  async saveTestDataset(datasetName, dataset) {
    const datasetPath = path.join(this.options.testDataDir, `${datasetName}.json`);
    
    try {
      fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2));
      console.log(`Test dataset saved: ${datasetPath}`);
      return datasetPath;
    } catch (error) {
      console.error(`Error saving test dataset: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Train predictive model
   * 
   * @param {string} modelName - Model name
   * @param {Object} trainingData - Training data
   * @returns {Promise<Object>} - Training results
   */
  async trainPredictiveModel(modelName, trainingData) {
    console.log(`Training predictive model: ${modelName}...`);
    
    try {
      const token = await this.getAuthToken();
      
      // Train model with training data
      for (const sample of trainingData.samples) {
        await axios.post(
          `${this.options.edgeUrl}/api/edge/translate`,
          {
            text: sample.text,
            sourceLanguage: sample.sourceLanguage,
            targetLanguage: sample.targetLanguage,
            medicalContext: sample.medicalContext || 'general'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
      }
      
      // Trigger model training
      const response = await axios.post(
        `${this.options.edgeUrl}/api/edge/predictive-cache/train`,
        {
          modelName,
          parameters: trainingData.parameters || {}
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      const trainingResults = response.data;
      
      // Add to test results
      this.testResults.models.push({
        name: modelName,
        timestamp: new Date().toISOString(),
        type: 'training',
        trainingData: {
          sampleCount: trainingData.samples.length,
          parameters: trainingData.parameters || {}
        },
        results: trainingResults
      });
      
      console.log(`Model training completed: ${modelName}`);
      
      return trainingResults;
    } catch (error) {
      console.error(`Error training predictive model: ${error.message}`);
      
      // Add to test results
      this.testResults.models.push({
        name: modelName,
        timestamp: new Date().toISOString(),
        type: 'training',
        trainingData: {
          sampleCount: trainingData.samples.length,
          parameters: trainingData.parameters || {}
        },
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Evaluate predictive model
   * 
   * @param {string} modelName - Model name
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} - Evaluation results
   */
  async evaluatePredictiveModel(modelName, testData) {
    console.log(`Evaluating predictive model: ${modelName}...`);
    
    try {
      const token = await this.getAuthToken();
      
      // Evaluate model with test data
      const results = {
        modelName,
        timestamp: new Date().toISOString(),
        sampleCount: testData.samples.length,
        predictions: [],
        metrics: {}
      };
      
      // Test each sample
      for (const sample of testData.samples) {
        // Get prediction
        const response = await axios.post(
          `${this.options.edgeUrl}/api/edge/predictive-cache/predict`,
          {
            context: sample.context || {},
            modelName
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        const prediction = response.data;
        
        // Check if prediction matches expected output
        const isCorrect = this.isPredictionCorrect(prediction, sample.expected);
        
        // Add to results
        results.predictions.push({
          input: sample.context || {},
          expected: sample.expected,
          predicted: prediction,
          isCorrect
        });
      }
      
      // Calculate metrics
      results.metrics = this.calculateMetrics(results.predictions);
      
      // Add to test results
      this.testResults.models.push({
        name: modelName,
        timestamp: new Date().toISOString(),
        type: 'evaluation',
        testData: {
          sampleCount: testData.samples.length
        },
        results
      });
      
      console.log(`Model evaluation completed: ${modelName}`);
      console.log(`Accuracy: ${results.metrics.accuracy.toFixed(4)}`);
      console.log(`Precision: ${results.metrics.precision.toFixed(4)}`);
      console.log(`Recall: ${results.metrics.recall.toFixed(4)}`);
      console.log(`F1 Score: ${results.metrics.f1Score.toFixed(4)}`);
      
      return results;
    } catch (error) {
      console.error(`Error evaluating predictive model: ${error.message}`);
      
      // Add to test results
      this.testResults.models.push({
        name: modelName,
        timestamp: new Date().toISOString(),
        type: 'evaluation',
        testData: {
          sampleCount: testData.samples.length
        },
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Check if prediction is correct
   * 
   * @param {Object} prediction - Prediction
   * @param {Object} expected - Expected output
   * @returns {boolean} - Whether prediction is correct
   */
  isPredictionCorrect(prediction, expected) {
    // This is a simplified implementation
    // In a real system, we would need more sophisticated comparison logic
    
    // Check if prediction contains expected items
    if (Array.isArray(expected)) {
      // If expected is an array, check if prediction contains all expected items
      return expected.every(item => 
        prediction.some(pred => 
          JSON.stringify(pred) === JSON.stringify(item)
        )
      );
    } else if (typeof expected === 'object') {
      // If expected is an object, check if prediction matches expected
      return JSON.stringify(prediction) === JSON.stringify(expected);
    } else {
      // Otherwise, check for equality
      return prediction === expected;
    }
  }
  
  /**
   * Calculate evaluation metrics
   * 
   * @param {Array<Object>} predictions - Predictions
   * @returns {Object} - Metrics
   */
  calculateMetrics(predictions) {
    const correctCount = predictions.filter(p => p.isCorrect).length;
    const totalCount = predictions.length;
    
    // Calculate accuracy
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    
    // For simplicity, we'll use accuracy for all metrics
    // In a real system, we would calculate precision, recall, and F1 score properly
    const precision = accuracy;
    const recall = accuracy;
    const f1Score = precision > 0 && recall > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      correctCount,
      totalCount
    };
  }
  
  /**
   * Compare models
   * 
   * @param {string} modelA - First model name
   * @param {string} modelB - Second model name
   * @param {Object} testData - Test data
   * @returns {Promise<Object>} - Comparison results
   */
  async compareModels(modelA, modelB, testData) {
    console.log(`Comparing models: ${modelA} vs ${modelB}...`);
    
    try {
      // Evaluate both models
      const resultsA = await this.evaluatePredictiveModel(modelA, testData);
      const resultsB = await this.evaluatePredictiveModel(modelB, testData);
      
      // Compare results
      const comparison = {
        modelA: {
          name: modelA,
          metrics: resultsA.metrics
        },
        modelB: {
          name: modelB,
          metrics: resultsB.metrics
        },
        differences: {
          accuracy: resultsB.metrics.accuracy - resultsA.metrics.accuracy,
          precision: resultsB.metrics.precision - resultsA.metrics.precision,
          recall: resultsB.metrics.recall - resultsA.metrics.recall,
          f1Score: resultsB.metrics.f1Score - resultsA.metrics.f1Score
        }
      };
      
      // Add to test results
      this.testResults.models.push({
        name: `${modelA}-vs-${modelB}`,
        timestamp: new Date().toISOString(),
        type: 'comparison',
        testData: {
          sampleCount: testData.samples.length
        },
        results: comparison
      });
      
      console.log(`Model comparison completed: ${modelA} vs ${modelB}`);
      console.log(`Accuracy difference: ${comparison.differences.accuracy.toFixed(4)}`);
      console.log(`F1 Score difference: ${comparison.differences.f1Score.toFixed(4)}`);
      
      return comparison;
    } catch (error) {
      console.error(`Error comparing models: ${error.message}`);
      
      // Add to test results
      this.testResults.models.push({
        name: `${modelA}-vs-${modelB}`,
        timestamp: new Date().toISOString(),
        type: 'comparison',
        testData: {
          sampleCount: testData.samples.length
        },
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Save test results
   * 
   * @returns {Promise<string>} - Path to saved results
   */
  async saveResults() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsPath = path.join(this.options.reportDir, `ml-test-${this.options.testId}-${timestamp}.json`);
    
    try {
      fs.writeFileSync(resultsPath, JSON.stringify(this.testResults, null, 2));
      console.log(`Test results saved: ${resultsPath}`);
      return resultsPath;
    } catch (error) {
      console.error(`Error saving test results: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Generate HTML report
   * 
   * @returns {Promise<string>} - Path to HTML report
   */
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const reportPath = path.join(this.options.reportDir, `ml-test-${this.options.testId}-${timestamp}.html`);
    
    // Generate HTML content
    // This is a placeholder for a more sophisticated HTML report
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ML Model Test Report: ${this.options.testId}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #2c3e50;
          }
          .summary {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f8f9fa;
          }
          .better {
            color: #28a745;
          }
          .worse {
            color: #dc3545;
          }
          .neutral {
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <h1>ML Model Test Report: ${this.options.testId}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <h2>Summary</h2>
          <p>Test ID: ${this.options.testId}</p>
          <p>Timestamp: ${this.testResults.timestamp}</p>
          <p>Models: ${this.testResults.models.length}</p>
        </div>
        
        <h2>Model Results</h2>
        
        ${this.testResults.models.map(model => `
          <div class="model-result">
            <h3>${model.name} (${model.type})</h3>
            <p>Timestamp: ${model.timestamp}</p>
            
            ${model.error ? `
              <p class="worse">Error: ${model.error}</p>
            ` : ''}
            
            ${model.type === 'evaluation' && model.results ? `
              <h4>Evaluation Metrics</h4>
              <table>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td>Accuracy</td>
                  <td>${model.results.metrics.accuracy.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>Precision</td>
                  <td>${model.results.metrics.precision.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>Recall</td>
                  <td>${model.results.metrics.recall.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>F1 Score</td>
                  <td>${model.results.metrics.f1Score.toFixed(4)}</td>
                </tr>
                <tr>
                  <td>Correct Predictions</td>
                  <td>${model.results.metrics.correctCount} / ${model.results.metrics.totalCount}</td>
                </tr>
              </table>
            ` : ''}
            
            ${model.type === 'comparison' && model.results ? `
              <h4>Model Comparison</h4>
              <table>
                <tr>
                  <th>Metric</th>
                  <th>${model.results.modelA.name}</th>
                  <th>${model.results.modelB.name}</th>
                  <th>Difference</th>
                </tr>
                <tr>
                  <td>Accuracy</td>
                  <td>${model.results.modelA.metrics.accuracy.toFixed(4)}</td>
                  <td>${model.results.modelB.metrics.accuracy.toFixed(4)}</td>
                  <td class="${model.results.differences.accuracy > 0 ? 'better' : model.results.differences.accuracy < 0 ? 'worse' : 'neutral'}">
                    ${model.results.differences.accuracy > 0 ? '+' : ''}${model.results.differences.accuracy.toFixed(4)}
                  </td>
                </tr>
                <tr>
                  <td>Precision</td>
                  <td>${model.results.modelA.metrics.precision.toFixed(4)}</td>
                  <td>${model.results.modelB.metrics.precision.toFixed(4)}</td>
                  <td class="${model.results.differences.precision > 0 ? 'better' : model.results.differences.precision < 0 ? 'worse' : 'neutral'}">
                    ${model.results.differences.precision > 0 ? '+' : ''}${model.results.differences.precision.toFixed(4)}
                  </td>
                </tr>
                <tr>
                  <td>Recall</td>
                  <td>${model.results.modelA.metrics.recall.toFixed(4)}</td>
                  <td>${model.results.modelB.metrics.recall.toFixed(4)}</td>
                  <td class="${model.results.differences.recall > 0 ? 'better' : model.results.differences.recall < 0 ? 'worse' : 'neutral'}">
                    ${model.results.differences.recall > 0 ? '+' : ''}${model.results.differences.recall.toFixed(4)}
                  </td>
                </tr>
                <tr>
                  <td>F1 Score</td>
                  <td>${model.results.modelA.metrics.f1Score.toFixed(4)}</td>
                  <td>${model.results.modelB.metrics.f1Score.toFixed(4)}</td>
                  <td class="${model.results.differences.f1Score > 0 ? 'better' : model.results.differences.f1Score < 0 ? 'worse' : 'neutral'}">
                    ${model.results.differences.f1Score > 0 ? '+' : ''}${model.results.differences.f1Score.toFixed(4)}
                  </td>
                </tr>
              </table>
            ` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
    
    try {
      fs.writeFileSync(reportPath, html);
      console.log(`Report generated: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error(`Error generating report: ${error.message}`);
      throw error;
    }
  }
}

module.exports = {
  MLModelTesting,
  config
};
