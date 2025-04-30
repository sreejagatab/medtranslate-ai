# MedTranslate AI Performance Benchmarks

This directory contains comprehensive performance benchmarking tools for the MedTranslate AI system, allowing you to measure and analyze the performance of different components under various conditions.

## Performance Benchmarking Framework

The performance benchmarking framework consists of several components:

1. **Benchmark Framework** (`benchmark-framework.js`): Core framework for running benchmarks, collecting metrics, and generating reports.

2. **Edge Benchmark** (`edge-benchmark.js`): Benchmarks the edge component under different conditions and configurations.

3. **Backend Benchmark** (`backend-benchmark.js`): Benchmarks the backend component under different conditions and configurations.

4. **Integration Benchmark** (`integration-benchmark.js`): Benchmarks the integrated system, including backend, edge, and frontend components working together.

5. **Device Simulator** (`device-simulator.js`): Simulates different device profiles and network conditions for realistic performance testing.

## Running Performance Benchmarks

You can run the performance benchmarks using the following npm scripts:

```bash
# Run all performance benchmarks
npm run test:performance

# Run specific component benchmarks
npm run test:performance:edge
npm run test:performance:backend
npm run test:performance:integration

# Run specific benchmark types
npm run test:performance:translation
npm run test:performance:cache
npm run test:performance:offline
```

You can also run the benchmarks directly using the benchmark runner:

```bash
# Run all benchmarks
node scripts/run-performance-benchmarks.js

# Run specific component benchmarks
node scripts/run-performance-benchmarks.js edge
node scripts/run-performance-benchmarks.js backend
node scripts/run-performance-benchmarks.js integration

# Run specific benchmark types
node scripts/run-performance-benchmarks.js edge translation
node scripts/run-performance-benchmarks.js backend websocket
node scripts/run-performance-benchmarks.js integration offline-sync
```

## Benchmark Configuration

The benchmarks can be configured using environment variables:

- `BENCHMARK_ITERATIONS`: Number of iterations to run (default: 50)
- `BENCHMARK_WARMUP_ITERATIONS`: Number of warmup iterations (default: 5)
- `BENCHMARK_REPORT_DIR`: Directory to save benchmark reports (default: `benchmark-reports`)
- `BACKEND_URL`: URL of the backend server (default: `http://localhost:3001`)
- `EDGE_URL`: URL of the edge server (default: `http://localhost:3002`)
- `WS_URL`: URL of the WebSocket server (default: `ws://localhost:3001/ws`)

You can set these environment variables before running the benchmarks:

```bash
BENCHMARK_ITERATIONS=100 BENCHMARK_WARMUP_ITERATIONS=10 npm run test:performance
```

## Benchmark Reports

Benchmark reports are saved to the `benchmark-reports` directory in both JSON and HTML formats. The HTML reports provide a visual representation of the benchmark results, including:

- Performance statistics (min, max, mean, median, p95, p99, standard deviation)
- Resource usage (memory, CPU)
- Charts and graphs
- System information

## Available Benchmarks

### Edge Component Benchmarks

- **Text Translation**: Measures the performance of text translation with different concurrency levels.
- **Audio Translation**: Measures the performance of audio translation with different audio sizes.
- **Cache Performance**: Measures the performance of the cache system with different concurrency levels.
- **Sync Performance**: Measures the performance of synchronization with the backend.
- **Offline Performance**: Measures the performance of the edge component in offline mode.
- **Device Profile Performance**: Measures the performance across different simulated device profiles.
- **Optimization Level Performance**: Measures the performance with different model optimization levels.

### Backend Component Benchmarks

- **Text Translation**: Measures the performance of text translation with different concurrency levels.
- **Audio Translation**: Measures the performance of audio translation with different audio sizes.
- **WebSocket Performance**: Measures the performance of WebSocket communication.
- **Authentication Performance**: Measures the performance of authentication with different concurrency levels.
- **Storage Performance**: Measures the performance of session storage with different concurrency levels.

### Integration Benchmarks

- **Full Translation Flow**: Measures the performance of the complete translation flow across different device profiles and network conditions.
- **Edge Fallback**: Measures the performance of the fallback mechanism when the edge component is offline.
- **Offline Synchronization**: Measures the performance of synchronizing offline queue when the edge component comes back online.

## Device Simulation

The device simulator allows you to test performance across different device profiles and network conditions:

### Device Profiles

- **low-end**: 2 CPU cores @ 1.2 GHz, 2GB RAM, no GPU
- **mid-range**: 4 CPU cores @ 2.0 GHz, 8GB RAM, no GPU
- **high-end**: 8 CPU cores @ 3.0 GHz, 16GB RAM, GPU available
- **tablet**: 4 CPU cores @ 1.8 GHz, 4GB RAM, GPU available
- **smartphone**: 6 CPU cores @ 2.2 GHz, 6GB RAM, GPU available

### Network Conditions

- **offline**: No network connectivity
- **2g**: 250 Kbps bandwidth, 300ms latency
- **3g**: 1.5 Mbps bandwidth, 100ms latency
- **4g**: 10 Mbps bandwidth, 50ms latency
- **5g**: 100 Mbps bandwidth, 10ms latency
- **wifi**: 50 Mbps bandwidth, 20ms latency
- **ethernet**: 1 Gbps bandwidth, 5ms latency

## Benchmark Metrics

The benchmarks collect the following metrics:

- **Response Time**: Min, max, mean, median, p95, p99, standard deviation
- **Memory Usage**: RSS, heap total, heap used, external
- **CPU Usage**: User, system, total
- **Throughput**: Requests per second
- **Success Rate**: Percentage of successful requests

## Comparing Benchmarks

The benchmark framework includes tools for comparing multiple benchmark results:

```bash
# Compare all benchmark results
node scripts/run-performance-benchmarks.js all all
```

This will generate a comparison report that shows the relative performance of different components and configurations.

## Writing Custom Benchmarks

You can create custom benchmarks by extending the benchmark framework:

```javascript
const { runBenchmark } = require('./benchmark-framework');

async function myCustomBenchmark() {
  // Define test function
  const testFn = async () => {
    // Your test code here
  };
  
  // Run benchmark
  return runBenchmark(
    'My Custom Benchmark',
    testFn,
    {
      iterations: 50,
      warmupIterations: 5,
      concurrency: 1
    }
  );
}
```

## Best Practices

- Run benchmarks on a dedicated machine to avoid interference from other processes
- Run multiple iterations to get statistically significant results
- Include warmup iterations to avoid cold start effects
- Test with different concurrency levels to understand scaling behavior
- Test with different device profiles and network conditions to understand real-world performance
- Compare benchmark results over time to track performance changes
