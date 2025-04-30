/**
 * Performance Benchmarking Framework for MedTranslate AI
 * 
 * This module provides a comprehensive framework for performance testing
 * of the MedTranslate AI system, including:
 * - Timing measurements
 * - Resource usage tracking
 * - Statistical analysis
 * - Report generation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  reportDir: process.env.BENCHMARK_REPORT_DIR || path.join(__dirname, '../../benchmark-reports'),
  includeSystemInfo: true,
  includeTimestamps: true,
  includeRawData: true,
  defaultWarmupIterations: 5,
  defaultTestIterations: 50,
  defaultConcurrency: 1
};

/**
 * Run a benchmark test
 * 
 * @param {string} testName - Name of the benchmark test
 * @param {Function} testFn - Test function to benchmark
 * @param {Object} options - Benchmark options
 * @returns {Object} - Benchmark results
 */
async function runBenchmark(testName, testFn, options = {}) {
  const warmupIterations = options.warmupIterations || CONFIG.defaultWarmupIterations;
  const iterations = options.iterations || CONFIG.defaultTestIterations;
  const concurrency = options.concurrency || CONFIG.defaultConcurrency;
  const saveResults = options.saveResults !== false;
  
  console.log(`Running benchmark: ${testName}`);
  console.log(`Warmup iterations: ${warmupIterations}`);
  console.log(`Test iterations: ${iterations}`);
  console.log(`Concurrency: ${concurrency}`);
  
  // Collect system info before test
  const systemInfo = getSystemInfo();
  
  // Run warmup iterations
  console.log('Warming up...');
  for (let i = 0; i < warmupIterations; i++) {
    await testFn();
  }
  
  // Run test iterations
  console.log('Running benchmark...');
  const durations = [];
  const memoryUsage = [];
  const cpuUsage = [];
  const startTime = performance.now();
  
  // Run iterations with specified concurrency
  for (let i = 0; i < iterations; i += concurrency) {
    const batchSize = Math.min(concurrency, iterations - i);
    const batchPromises = [];
    
    for (let j = 0; j < batchSize; j++) {
      batchPromises.push(runSingleIteration(testFn));
    }
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      durations.push(result.duration);
      memoryUsage.push(result.memoryUsage);
      cpuUsage.push(result.cpuUsage);
    }
    
    // Log progress
    if ((i + batchSize) % 10 === 0 || (i + batchSize) === iterations) {
      console.log(`Completed ${i + batchSize}/${iterations} iterations`);
    }
  }
  
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  // Calculate statistics
  const stats = calculateStatistics(durations);
  
  // Create benchmark result
  const result = {
    testName,
    timestamp: new Date().toISOString(),
    iterations,
    concurrency,
    totalDuration,
    statistics: stats,
    system: systemInfo,
    resourceUsage: {
      memory: calculateResourceStatistics(memoryUsage),
      cpu: calculateResourceStatistics(cpuUsage)
    }
  };
  
  // Include raw data if configured
  if (CONFIG.includeRawData) {
    result.rawData = {
      durations,
      memoryUsage,
      cpuUsage
    };
  }
  
  // Save results if configured
  if (saveResults) {
    saveResultsToFile(result);
  }
  
  // Print summary
  printSummary(result);
  
  return result;
}

/**
 * Run a single benchmark iteration
 * 
 * @param {Function} testFn - Test function to benchmark
 * @returns {Object} - Iteration results
 */
async function runSingleIteration(testFn) {
  // Record memory and CPU usage before
  const memBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  
  // Run test and measure duration
  const startTime = performance.now();
  await testFn();
  const endTime = performance.now();
  
  // Record memory and CPU usage after
  const memAfter = process.memoryUsage();
  const cpuAfter = process.cpuUsage(cpuBefore);
  
  // Calculate memory and CPU deltas
  const memoryDelta = {
    rss: memAfter.rss - memBefore.rss,
    heapTotal: memAfter.heapTotal - memBefore.heapTotal,
    heapUsed: memAfter.heapUsed - memBefore.heapUsed,
    external: memAfter.external - memBefore.external
  };
  
  return {
    duration: endTime - startTime,
    memoryUsage: memoryDelta,
    cpuUsage: cpuAfter
  };
}

/**
 * Calculate statistics for benchmark durations
 * 
 * @param {Array<number>} durations - Array of durations
 * @returns {Object} - Statistics
 */
function calculateStatistics(durations) {
  // Sort durations for percentile calculations
  const sorted = [...durations].sort((a, b) => a - b);
  
  // Calculate basic statistics
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = durations.reduce((sum, val) => sum + val, 0) / durations.length;
  
  // Calculate median (50th percentile)
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Calculate percentiles
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  
  // Calculate standard deviation
  const variance = durations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    min,
    max,
    mean,
    median,
    p95,
    p99,
    stdDev
  };
}

/**
 * Calculate resource usage statistics
 * 
 * @param {Array<Object>} data - Array of resource usage data
 * @returns {Object} - Statistics
 */
function calculateResourceStatistics(data) {
  if (data.length === 0) {
    return null;
  }
  
  // For memory usage, calculate average across all iterations
  if (typeof data[0] === 'object' && data[0].rss !== undefined) {
    const avgRss = data.reduce((sum, val) => sum + val.rss, 0) / data.length;
    const avgHeapTotal = data.reduce((sum, val) => sum + val.heapTotal, 0) / data.length;
    const avgHeapUsed = data.reduce((sum, val) => sum + val.heapUsed, 0) / data.length;
    const avgExternal = data.reduce((sum, val) => sum + val.external, 0) / data.length;
    
    return {
      avgRssMB: avgRss / (1024 * 1024),
      avgHeapTotalMB: avgHeapTotal / (1024 * 1024),
      avgHeapUsedMB: avgHeapUsed / (1024 * 1024),
      avgExternalMB: avgExternal / (1024 * 1024)
    };
  }
  
  // For CPU usage, calculate average across all iterations
  if (typeof data[0] === 'object' && data[0].user !== undefined) {
    const avgUser = data.reduce((sum, val) => sum + val.user, 0) / data.length;
    const avgSystem = data.reduce((sum, val) => sum + val.system, 0) / data.length;
    
    return {
      avgUserMicros: avgUser,
      avgSystemMicros: avgSystem,
      avgTotalMicros: avgUser + avgSystem
    };
  }
  
  return null;
}

/**
 * Get system information
 * 
 * @returns {Object} - System information
 */
function getSystemInfo() {
  const cpus = os.cpus();
  
  return {
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown',
    cpuCount: cpus.length,
    cpuSpeed: cpus.length > 0 ? cpus[0].speed : 0,
    totalMemoryMB: os.totalmem() / (1024 * 1024),
    freeMemoryMB: os.freemem() / (1024 * 1024),
    nodeVersion: process.version,
    hostname: os.hostname()
  };
}

/**
 * Save benchmark results to file
 * 
 * @param {Object} result - Benchmark result
 * @returns {string} - Path to saved file
 */
function saveResultsToFile(result) {
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${result.testName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.json`;
  const filePath = path.join(CONFIG.reportDir, filename);
  
  // Save results
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  
  console.log(`Benchmark results saved to: ${filePath}`);
  
  return filePath;
}

/**
 * Print benchmark summary
 * 
 * @param {Object} result - Benchmark result
 */
function printSummary(result) {
  console.log('\n=== Benchmark Summary ===');
  console.log(`Test: ${result.testName}`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Concurrency: ${result.concurrency}`);
  console.log(`Total Duration: ${result.totalDuration.toFixed(2)}ms`);
  
  console.log('\nPerformance Statistics:');
  console.log(`  Min: ${result.statistics.min.toFixed(2)}ms`);
  console.log(`  Max: ${result.statistics.max.toFixed(2)}ms`);
  console.log(`  Mean: ${result.statistics.mean.toFixed(2)}ms`);
  console.log(`  Median: ${result.statistics.median.toFixed(2)}ms`);
  console.log(`  P95: ${result.statistics.p95.toFixed(2)}ms`);
  console.log(`  P99: ${result.statistics.p99.toFixed(2)}ms`);
  console.log(`  Std Dev: ${result.statistics.stdDev.toFixed(2)}ms`);
  
  if (result.resourceUsage.memory) {
    console.log('\nMemory Usage:');
    console.log(`  Avg RSS: ${result.resourceUsage.memory.avgRssMB.toFixed(2)}MB`);
    console.log(`  Avg Heap Total: ${result.resourceUsage.memory.avgHeapTotalMB.toFixed(2)}MB`);
    console.log(`  Avg Heap Used: ${result.resourceUsage.memory.avgHeapUsedMB.toFixed(2)}MB`);
  }
  
  if (result.resourceUsage.cpu) {
    console.log('\nCPU Usage:');
    console.log(`  Avg User: ${result.resourceUsage.cpu.avgUserMicros.toFixed(2)}µs`);
    console.log(`  Avg System: ${result.resourceUsage.cpu.avgSystemMicros.toFixed(2)}µs`);
  }
}

/**
 * Generate HTML report from benchmark results
 * 
 * @param {Object} result - Benchmark result
 * @returns {string} - HTML report
 */
function generateHtmlReport(result) {
  // Generate HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${result.testName} - Benchmark Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .summary-item {
      padding: 15px;
      margin-right: 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      background-color: #f8f9fa;
      min-width: 200px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px 15px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
    }
    .system-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
    .chart-container {
      width: 100%;
      height: 400px;
      margin-bottom: 30px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>${result.testName} - Benchmark Report</h1>
  <p>Report generated on ${new Date(result.timestamp).toLocaleString()}</p>
  
  <div class="summary">
    <div class="summary-item">
      <h3>Iterations</h3>
      <p>${result.iterations}</p>
    </div>
    <div class="summary-item">
      <h3>Concurrency</h3>
      <p>${result.concurrency}</p>
    </div>
    <div class="summary-item">
      <h3>Total Duration</h3>
      <p>${result.totalDuration.toFixed(2)}ms</p>
    </div>
    <div class="summary-item">
      <h3>Mean Response Time</h3>
      <p>${result.statistics.mean.toFixed(2)}ms</p>
    </div>
    <div class="summary-item">
      <h3>P95 Response Time</h3>
      <p>${result.statistics.p95.toFixed(2)}ms</p>
    </div>
  </div>
  
  <h2>Performance Statistics</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Min Response Time</td>
        <td>${result.statistics.min.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>Max Response Time</td>
        <td>${result.statistics.max.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>Mean Response Time</td>
        <td>${result.statistics.mean.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>Median Response Time</td>
        <td>${result.statistics.median.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>P95 Response Time</td>
        <td>${result.statistics.p95.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>P99 Response Time</td>
        <td>${result.statistics.p99.toFixed(2)}ms</td>
      </tr>
      <tr>
        <td>Standard Deviation</td>
        <td>${result.statistics.stdDev.toFixed(2)}ms</td>
      </tr>
    </tbody>
  </table>
`;

  // Add resource usage if available
  if (result.resourceUsage.memory) {
    html += `
  <h2>Memory Usage</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Avg RSS</td>
        <td>${result.resourceUsage.memory.avgRssMB.toFixed(2)}MB</td>
      </tr>
      <tr>
        <td>Avg Heap Total</td>
        <td>${result.resourceUsage.memory.avgHeapTotalMB.toFixed(2)}MB</td>
      </tr>
      <tr>
        <td>Avg Heap Used</td>
        <td>${result.resourceUsage.memory.avgHeapUsedMB.toFixed(2)}MB</td>
      </tr>
      <tr>
        <td>Avg External</td>
        <td>${result.resourceUsage.memory.avgExternalMB.toFixed(2)}MB</td>
      </tr>
    </tbody>
  </table>
`;
  }

  // Add CPU usage if available
  if (result.resourceUsage.cpu) {
    html += `
  <h2>CPU Usage</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Avg User CPU</td>
        <td>${result.resourceUsage.cpu.avgUserMicros.toFixed(2)}µs</td>
      </tr>
      <tr>
        <td>Avg System CPU</td>
        <td>${result.resourceUsage.cpu.avgSystemMicros.toFixed(2)}µs</td>
      </tr>
      <tr>
        <td>Avg Total CPU</td>
        <td>${result.resourceUsage.cpu.avgTotalMicros.toFixed(2)}µs</td>
      </tr>
    </tbody>
  </table>
`;
  }

  // Add system info
  html += `
  <h2>System Information</h2>
  <div class="system-info">
    <p><strong>Platform:</strong> ${result.system.platform} (${result.system.arch})</p>
    <p><strong>CPU:</strong> ${result.system.cpuModel} (${result.system.cpuCount} cores @ ${result.system.cpuSpeed}MHz)</p>
    <p><strong>Memory:</strong> ${Math.round(result.system.totalMemoryMB / 1024)} GB total, ${Math.round(result.system.freeMemoryMB / 1024)} GB free</p>
    <p><strong>Node Version:</strong> ${result.system.nodeVersion}</p>
    <p><strong>Hostname:</strong> ${result.system.hostname}</p>
  </div>
`;

  // Add charts if raw data is available
  if (result.rawData && result.rawData.durations) {
    html += `
  <h2>Response Time Distribution</h2>
  <div class="chart-container">
    <canvas id="responseTimeChart"></canvas>
  </div>
  
  <script>
    // Response time chart
    const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
    new Chart(responseTimeCtx, {
      type: 'line',
      data: {
        labels: Array.from({ length: ${result.rawData.durations.length} }, (_, i) => i + 1),
        datasets: [{
          label: 'Response Time (ms)',
          data: ${JSON.stringify(result.rawData.durations)},
          borderColor: '#0066cc',
          backgroundColor: 'rgba(0, 102, 204, 0.1)',
          borderWidth: 1,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Iteration'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Response Time (ms)'
            },
            beginAtZero: true
          }
        }
      }
    });
  </script>
`;
  }

  html += `
</body>
</html>
  `;
  
  return html;
}

/**
 * Save HTML report to file
 * 
 * @param {Object} result - Benchmark result
 * @returns {string} - Path to saved file
 */
function saveHtmlReport(result) {
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Generate filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${result.testName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`;
  const filePath = path.join(CONFIG.reportDir, filename);
  
  // Generate HTML report
  const html = generateHtmlReport(result);
  
  // Save report
  fs.writeFileSync(filePath, html);
  
  console.log(`HTML benchmark report saved to: ${filePath}`);
  
  return filePath;
}

/**
 * Compare multiple benchmark results
 * 
 * @param {Array<Object>} results - Array of benchmark results
 * @param {string} comparisonName - Name of the comparison
 * @returns {Object} - Comparison result
 */
function compareBenchmarks(results, comparisonName) {
  if (!results || results.length === 0) {
    throw new Error('No benchmark results to compare');
  }
  
  // Create comparison object
  const comparison = {
    name: comparisonName,
    timestamp: new Date().toISOString(),
    benchmarks: results.map(r => ({
      name: r.testName,
      iterations: r.iterations,
      concurrency: r.concurrency,
      statistics: r.statistics
    })),
    system: results[0].system
  };
  
  // Save comparison
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${comparisonName.toLowerCase().replace(/\s+/g, '-')}-comparison-${timestamp}.json`;
  const filePath = path.join(CONFIG.reportDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(comparison, null, 2));
  
  console.log(`Benchmark comparison saved to: ${filePath}`);
  
  // Generate HTML comparison
  const htmlPath = saveHtmlComparison(comparison);
  
  return {
    comparison,
    filePath,
    htmlPath
  };
}

/**
 * Save HTML comparison to file
 * 
 * @param {Object} comparison - Comparison result
 * @returns {string} - Path to saved file
 */
function saveHtmlComparison(comparison) {
  // Generate filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `${comparison.name.toLowerCase().replace(/\s+/g, '-')}-comparison-${timestamp}.html`;
  const filePath = path.join(CONFIG.reportDir, filename);
  
  // Generate HTML comparison
  const html = generateHtmlComparison(comparison);
  
  // Save report
  fs.writeFileSync(filePath, html);
  
  console.log(`HTML benchmark comparison saved to: ${filePath}`);
  
  return filePath;
}

/**
 * Generate HTML comparison
 * 
 * @param {Object} comparison - Comparison result
 * @returns {string} - HTML comparison
 */
function generateHtmlComparison(comparison) {
  // Extract benchmark names and statistics
  const benchmarkNames = comparison.benchmarks.map(b => b.name);
  const meanValues = comparison.benchmarks.map(b => b.statistics.mean);
  const medianValues = comparison.benchmarks.map(b => b.statistics.median);
  const p95Values = comparison.benchmarks.map(b => b.statistics.p95);
  const p99Values = comparison.benchmarks.map(b => b.statistics.p99);
  
  // Generate HTML
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${comparison.name} - Benchmark Comparison</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px 15px;
      border: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
    }
    .chart-container {
      width: 100%;
      height: 400px;
      margin-bottom: 30px;
    }
    .system-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>${comparison.name} - Benchmark Comparison</h1>
  <p>Report generated on ${new Date(comparison.timestamp).toLocaleString()}</p>
  
  <div class="chart-container">
    <canvas id="comparisonChart"></canvas>
  </div>
  
  <h2>Comparison Table</h2>
  <table>
    <thead>
      <tr>
        <th>Benchmark</th>
        <th>Iterations</th>
        <th>Concurrency</th>
        <th>Mean (ms)</th>
        <th>Median (ms)</th>
        <th>P95 (ms)</th>
        <th>P99 (ms)</th>
        <th>Min (ms)</th>
        <th>Max (ms)</th>
        <th>Std Dev (ms)</th>
      </tr>
    </thead>
    <tbody>
`;

  // Add benchmark rows
  for (const benchmark of comparison.benchmarks) {
    html += `
      <tr>
        <td>${benchmark.name}</td>
        <td>${benchmark.iterations}</td>
        <td>${benchmark.concurrency}</td>
        <td>${benchmark.statistics.mean.toFixed(2)}</td>
        <td>${benchmark.statistics.median.toFixed(2)}</td>
        <td>${benchmark.statistics.p95.toFixed(2)}</td>
        <td>${benchmark.statistics.p99.toFixed(2)}</td>
        <td>${benchmark.statistics.min.toFixed(2)}</td>
        <td>${benchmark.statistics.max.toFixed(2)}</td>
        <td>${benchmark.statistics.stdDev.toFixed(2)}</td>
      </tr>
    `;
  }

  html += `
    </tbody>
  </table>
  
  <h2>System Information</h2>
  <div class="system-info">
    <p><strong>Platform:</strong> ${comparison.system.platform} (${comparison.system.arch})</p>
    <p><strong>CPU:</strong> ${comparison.system.cpuModel} (${comparison.system.cpuCount} cores @ ${comparison.system.cpuSpeed}MHz)</p>
    <p><strong>Memory:</strong> ${Math.round(comparison.system.totalMemoryMB / 1024)} GB total, ${Math.round(comparison.system.freeMemoryMB / 1024)} GB free</p>
    <p><strong>Node Version:</strong> ${comparison.system.nodeVersion}</p>
    <p><strong>Hostname:</strong> ${comparison.system.hostname}</p>
  </div>
  
  <script>
    // Comparison chart
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    new Chart(comparisonCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(benchmarkNames)},
        datasets: [
          {
            label: 'Mean Response Time (ms)',
            data: ${JSON.stringify(meanValues)},
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'P95 Response Time (ms)',
            data: ${JSON.stringify(p95Values)},
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Response Time (ms)'
            }
          }
        }
      }
    });
  </script>
</body>
</html>
  `;
  
  return html;
}

module.exports = {
  runBenchmark,
  saveResultsToFile,
  saveHtmlReport,
  compareBenchmarks,
  CONFIG
};
