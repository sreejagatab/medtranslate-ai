/**
 * Predictive Cache Model Tests for MedTranslate AI
 * 
 * This file contains tests for the predictive caching ML model.
 */

const { MLModelTesting } = require('./ml-model-testing-framework');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testDataPath: path.join(__dirname, '../test-data/ml/predictive-cache-test-data.json')
};

// Load test data or create if it doesn't exist
let testData;
if (fs.existsSync(config.testDataPath)) {
  testData = JSON.parse(fs.readFileSync(config.testDataPath, 'utf8'));
} else {
  // Create sample test data
  testData = {
    training: {
      samples: [
        // General medical phrases
        { text: "How are you feeling today?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "general" },
        { text: "Where does it hurt?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "general" },
        { text: "Have you taken any medication?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "general" },
        { text: "Do you have any allergies?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "general" },
        { text: "I need to check your blood pressure.", sourceLanguage: "en", targetLanguage: "es", medicalContext: "general" },
        
        // Cardiology phrases
        { text: "Have you experienced chest pain?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "cardiology" },
        { text: "Do you have a history of heart disease?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "cardiology" },
        { text: "Are you taking any blood thinners?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "cardiology" },
        { text: "Have you had any palpitations?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "cardiology" },
        { text: "Do you get short of breath with exertion?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "cardiology" },
        
        // Neurology phrases
        { text: "Have you had any headaches?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "neurology" },
        { text: "Have you experienced any numbness or tingling?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "neurology" },
        { text: "Have you had any seizures?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "neurology" },
        { text: "Do you have a history of stroke?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "neurology" },
        { text: "Have you had any memory problems?", sourceLanguage: "en", targetLanguage: "es", medicalContext: "neurology" }
      ],
      parameters: {
        learningRate: 0.01,
        epochs: 100,
        batchSize: 32
      }
    },
    testing: {
      samples: [
        // Test samples for general context
        {
          context: {
            medicalContext: "general",
            recentPhrases: ["How are you feeling today?", "Where does it hurt?"],
            patientLanguage: "es",
            providerLanguage: "en"
          },
          expected: [
            { text: "Have you taken any medication?", sourceLanguage: "en", targetLanguage: "es" },
            { text: "Do you have any allergies?", sourceLanguage: "en", targetLanguage: "es" }
          ]
        },
        // Test samples for cardiology context
        {
          context: {
            medicalContext: "cardiology",
            recentPhrases: ["Have you experienced chest pain?"],
            patientLanguage: "es",
            providerLanguage: "en"
          },
          expected: [
            { text: "Do you have a history of heart disease?", sourceLanguage: "en", targetLanguage: "es" },
            { text: "Are you taking any blood thinners?", sourceLanguage: "en", targetLanguage: "es" }
          ]
        },
        // Test samples for neurology context
        {
          context: {
            medicalContext: "neurology",
            recentPhrases: ["Have you had any headaches?"],
            patientLanguage: "es",
            providerLanguage: "en"
          },
          expected: [
            { text: "Have you experienced any numbness or tingling?", sourceLanguage: "en", targetLanguage: "es" },
            { text: "Have you had any seizures?", sourceLanguage: "en", targetLanguage: "es" }
          ]
        }
      ]
    },
    // Alternative model with different parameters
    alternativeModel: {
      samples: [
        // Same samples as training data
      ],
      parameters: {
        learningRate: 0.005,
        epochs: 200,
        batchSize: 16
      }
    }
  };
  
  // Copy samples from training data to alternative model
  testData.alternativeModel.samples = [...testData.training.samples];
  
  // Save test data
  fs.mkdirSync(path.dirname(config.testDataPath), { recursive: true });
  fs.writeFileSync(config.testDataPath, JSON.stringify(testData, null, 2));
}

/**
 * Run predictive cache model tests
 */
async function runPredictiveCacheModelTests() {
  // Create ML model testing instance
  const mlTesting = new MLModelTesting();
  
  try {
    console.log('Running predictive cache model tests...');
    
    // Train default model
    await mlTesting.trainPredictiveModel('default', testData.training);
    
    // Evaluate default model
    await mlTesting.evaluatePredictiveModel('default', testData.testing);
    
    // Train alternative model
    await mlTesting.trainPredictiveModel('alternative', testData.alternativeModel);
    
    // Evaluate alternative model
    await mlTesting.evaluatePredictiveModel('alternative', testData.testing);
    
    // Compare models
    await mlTesting.compareModels('default', 'alternative', testData.testing);
    
    // Save results and generate report
    await mlTesting.saveResults();
    await mlTesting.generateReport();
    
    console.log('Predictive cache model tests completed successfully');
  } catch (error) {
    console.error('Error running predictive cache model tests:', error);
    
    // Save results and generate report even if tests fail
    try {
      await mlTesting.saveResults();
      await mlTesting.generateReport();
    } catch (reportError) {
      console.error('Error generating report:', reportError);
    }
  }
}

/**
 * Run model optimization tests
 */
async function runModelOptimizationTests() {
  // Create ML model testing instance
  const mlTesting = new MLModelTesting();
  
  try {
    console.log('Running model optimization tests...');
    
    // Define parameter ranges to test
    const learningRates = [0.001, 0.005, 0.01, 0.05];
    const epochs = [50, 100, 200];
    const batchSizes = [16, 32, 64];
    
    // Test different parameter combinations
    for (const learningRate of learningRates) {
      for (const epoch of epochs) {
        for (const batchSize of batchSizes) {
          const modelName = `model-lr${learningRate}-e${epoch}-bs${batchSize}`;
          
          // Create model with current parameters
          const modelData = {
            samples: [...testData.training.samples],
            parameters: {
              learningRate,
              epochs: epoch,
              batchSize
            }
          };
          
          // Train and evaluate model
          await mlTesting.trainPredictiveModel(modelName, modelData);
          await mlTesting.evaluatePredictiveModel(modelName, testData.testing);
        }
      }
    }
    
    // Save results and generate report
    await mlTesting.saveResults();
    await mlTesting.generateReport();
    
    console.log('Model optimization tests completed successfully');
  } catch (error) {
    console.error('Error running model optimization tests:', error);
    
    // Save results and generate report even if tests fail
    try {
      await mlTesting.saveResults();
      await mlTesting.generateReport();
    } catch (reportError) {
      console.error('Error generating report:', reportError);
    }
  }
}

/**
 * Run model compression tests
 */
async function runModelCompressionTests() {
  // Create ML model testing instance
  const mlTesting = new MLModelTesting();
  
  try {
    console.log('Running model compression tests...');
    
    // Train uncompressed model
    await mlTesting.trainPredictiveModel('uncompressed', testData.training);
    
    // Train compressed models with different compression levels
    const compressionLevels = [0.25, 0.5, 0.75];
    
    for (const compressionLevel of compressionLevels) {
      const modelName = `compressed-${compressionLevel}`;
      
      // Create model with compression
      const modelData = {
        samples: [...testData.training.samples],
        parameters: {
          ...testData.training.parameters,
          compressionLevel
        }
      };
      
      // Train and evaluate model
      await mlTesting.trainPredictiveModel(modelName, modelData);
      await mlTesting.evaluatePredictiveModel(modelName, testData.testing);
      
      // Compare with uncompressed model
      await mlTesting.compareModels('uncompressed', modelName, testData.testing);
    }
    
    // Save results and generate report
    await mlTesting.saveResults();
    await mlTesting.generateReport();
    
    console.log('Model compression tests completed successfully');
  } catch (error) {
    console.error('Error running model compression tests:', error);
    
    // Save results and generate report even if tests fail
    try {
      await mlTesting.saveResults();
      await mlTesting.generateReport();
    } catch (reportError) {
      console.error('Error generating report:', reportError);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  // Run basic tests by default
  runPredictiveCacheModelTests();
  
  // Uncomment to run optimization tests
  // runModelOptimizationTests();
  
  // Uncomment to run compression tests
  // runModelCompressionTests();
}

module.exports = {
  runPredictiveCacheModelTests,
  runModelOptimizationTests,
  runModelCompressionTests
};
