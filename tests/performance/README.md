# MedTranslate AI Performance Tests

This directory contains performance tests for the MedTranslate AI application, focusing on the edge computing component.

## Performance Test Framework

The performance tests use a custom framework (`framework.js`) that provides utilities for running performance tests and collecting metrics. The framework:

- Runs a specified number of iterations of a test function
- Collects timing information for each iteration
- Calculates performance metrics (min, max, mean, median, p95, p99, standard deviation)
- Saves results to disk for later analysis

## Edge Component Performance Tests

### Translation Module (`edge-translation.perf.js`)

Tests the performance of the translation module under different conditions:

- **Text Length**: Tests translation performance with short, medium, long, and very long texts
- **Language Pairs**: Tests translation performance with different language pairs (en-es, en-fr, es-en)
- **Medical Contexts**: Tests translation performance with different medical contexts (general, cardiology, neurology, pediatrics)

### Cache Module (`edge-cache.perf.js`)

Tests the performance of the cache module under different conditions:

- **Cache Operations**: Tests performance of cache read (hit and miss) and write operations
- **Cache Size**: Tests cache performance with different cache sizes (100, 1000, 10000 entries)
- **Cache Eviction**: Tests performance of cache eviction when the cache is full

### Sync Module (`edge-sync.perf.js`)

Tests the performance of the sync module under different conditions:

- **Network Conditions**: Tests sync performance under different network conditions (fast, slow, unreliable)
- **Batch Size**: Tests sync performance with different batch sizes (10, 100, 1000 items)
- **Model Updates**: Tests performance of model update checks and downloads
- **File Size**: Tests model download performance with different file sizes (1MB, 10MB, 100MB)

### Complete Edge Application (`edge-application.perf.js`)

Tests the performance of the complete edge application under different conditions:

- **Text Translation**: Tests application performance with different text lengths
- **Audio Translation**: Tests application performance with different audio sizes
- **Cache Performance**: Tests application performance with cache hits and misses
- **WebSocket Performance**: Tests application performance with WebSocket connections
- **Concurrent Requests**: Tests application performance with multiple concurrent requests

## Running Performance Tests

You can run the performance tests using the following npm scripts:

```bash
# Run all performance tests
npm run test:performance

# Run only edge performance tests
npm run test:edge:performance
```

You can also run individual performance test files directly:

```bash
node tests/performance/edge-translation.perf.js
node tests/performance/edge-cache.perf.js
node tests/performance/edge-sync.perf.js
node tests/performance/edge-application.perf.js
```

## Performance Test Results

Performance test results are saved to the `results/performance` directory in JSON format. Each result file includes:

- Test name and timestamp
- Number of iterations
- Total duration
- Performance metrics (min, max, mean, median, p95, p99, standard deviation)
- Individual durations for each iteration

You can use these results to:

- Track performance over time
- Compare performance between different implementations
- Identify performance bottlenecks
- Set performance baselines and thresholds

## Adding New Performance Tests

When adding new performance tests, follow these guidelines:

1. Use the `runPerformanceTest` function from the framework
2. Mock external dependencies to ensure consistent results
3. Test a range of input sizes and conditions
4. Include warmup iterations to avoid cold start effects
5. Use a sufficient number of iterations to get statistically significant results
6. Save results to disk for later analysis
