# ML Models for Predictive Caching

This directory contains advanced machine learning models for the predictive caching system in the MedTranslate AI Edge Application.

## Overview

The ML models enhance the predictive caching system by providing more accurate predictions for:
- Usage patterns based on time series analysis
- Content preferences based on user behavior
- Network connectivity patterns for offline risk assessment
- Hybrid recommendations combining multiple prediction approaches

## Components

### 1. Prediction Models (`prediction-model.js`)

This file contains the core ML model implementations:

#### Time Series Forecasting Models
- **ExponentialSmoothingModel**: Simple exponential smoothing for time series forecasting
- **HoltsModel**: Double exponential smoothing (Holt's method) for time series with trend
- **HoltWintersModel**: Triple exponential smoothing (Holt-Winters method) for seasonal data

#### Content-Based Filtering
- **ContentBasedFilteringModel**: Recommends content based on feature similarity

#### Network Analysis
- **NetworkPatternModel**: Analyzes network connectivity patterns to predict offline periods

#### Hybrid Approach
- **HybridRecommendationSystem**: Combines multiple models for better predictions

### 2. Model Adapter (`model-adapter.js`)

The model adapter provides a unified interface for the predictive caching system to interact with the ML models:

- **Initialization**: Sets up the ML models
- **Training**: Converts usage data to training data and trains the models
- **Prediction**: Generates predictions using the trained models
- **Performance Tracking**: Monitors model performance and adapts weights

## Usage

### Initialization

```javascript
const modelAdapter = require('./ml-models/model-adapter');

// Initialize the model adapter
await modelAdapter.initialize();
```

### Training

```javascript
// Get usage statistics
const usageStats = predictiveCache.getUsageStats();

// Train models with usage data
await modelAdapter.trainModels(usageStats);
```

### Generating Predictions

```javascript
// Generate predictions
const predictions = modelAdapter.generatePredictions({
  currentHour: new Date().getHours(),
  currentDay: new Date().getDay(),
  languagePair: 'en-es',
  context: 'general',
  confidenceThreshold: 0.2,
  maxPredictions: 20,
  includeOfflineRisk: true
});
```

### Predicting Offline Risk

```javascript
// Predict offline risk
const offlineRisk = modelAdapter.predictOfflineRisk();
console.log(`Current offline risk: ${(offlineRisk * 100).toFixed(1)}%`);
```

## Model Details

### Time Series Forecasting

The time series forecasting models analyze usage patterns over time to predict future usage. They are particularly useful for predicting when certain language pairs or contexts will be needed based on time of day, day of week, etc.

#### Exponential Smoothing

Simple exponential smoothing is used for time series without clear trend or seasonality:

```
S_t = α * Y_t + (1 - α) * S_{t-1}
```

Where:
- S_t is the smoothed value at time t
- Y_t is the observed value at time t
- α is the smoothing factor (0 < α < 1)

#### Holt's Method

Double exponential smoothing (Holt's method) is used for time series with trend:

```
Level: L_t = α * Y_t + (1 - α) * (L_{t-1} + T_{t-1})
Trend: T_t = β * (L_t - L_{t-1}) + (1 - β) * T_{t-1}
Forecast: F_{t+h} = L_t + h * T_t
```

Where:
- L_t is the level at time t
- T_t is the trend at time t
- α is the level smoothing factor (0 < α < 1)
- β is the trend smoothing factor (0 < β < 1)
- h is the number of steps ahead to forecast

#### Holt-Winters Method

Triple exponential smoothing (Holt-Winters method) is used for time series with both trend and seasonality:

```
Level: L_t = α * (Y_t / S_{t-s}) + (1 - α) * (L_{t-1} + T_{t-1})
Trend: T_t = β * (L_t - L_{t-1}) + (1 - β) * T_{t-1}
Seasonal: S_t = γ * (Y_t / L_t) + (1 - γ) * S_{t-s}
Forecast: F_{t+h} = (L_t + h * T_t) * S_{t-s+h mod s}
```

Where:
- L_t is the level at time t
- T_t is the trend at time t
- S_t is the seasonal component at time t
- s is the seasonal period
- α is the level smoothing factor (0 < α < 1)
- β is the trend smoothing factor (0 < β < 1)
- γ is the seasonal smoothing factor (0 < γ < 1)
- h is the number of steps ahead to forecast

### Content-Based Filtering

The content-based filtering model recommends content based on feature similarity. It builds profiles for content items and user preferences, then calculates similarity to make recommendations.

Key components:
- **Content Profiles**: Feature vectors for content items
- **User Preferences**: Feature vectors representing user preferences
- **Similarity Calculation**: Cosine similarity between feature vectors

### Network Pattern Analysis

The network pattern analysis model tracks network connectivity patterns to predict offline periods. It analyzes:
- Hourly patterns of connectivity
- Daily patterns of connectivity
- Location-based connectivity patterns

### Hybrid Recommendation System

The hybrid recommendation system combines predictions from multiple models to provide more accurate recommendations. It uses a weighted approach to combine:
- Time series predictions
- Content-based recommendations
- Network pattern predictions

The weights are adjusted based on the performance of each model.

## Performance Considerations

The ML models are designed to be lightweight and efficient for edge devices:
- Models use simple algorithms that don't require significant computational resources
- Training is incremental and can be performed on the device
- Prediction generation is fast and memory-efficient
- The system falls back to traditional methods if ML predictions are not available

## Testing

The ML models can be tested using the provided test suite:

```bash
# Run unit tests
jest tests/unit/ml-models.test.js

# Run integration tests
node tests/integration/ml-predictive-cache.test.js

# Run performance benchmarks
node tests/performance/ml-models-benchmark.js

# Run all tests
node tests/run-ml-model-tests.js
```

## Future Improvements

Potential future improvements to the ML models include:
- Adding more sophisticated time series models (ARIMA, Prophet)
- Implementing collaborative filtering for multi-user scenarios
- Adding deep learning models for more complex patterns
- Implementing transfer learning to leverage pre-trained models
- Adding reinforcement learning for adaptive caching strategies
