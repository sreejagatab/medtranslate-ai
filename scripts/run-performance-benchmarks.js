/**
 * Performance Benchmark Runner for MedTranslate AI
 * 
 * This script runs comprehensive performance benchmarks for the MedTranslate AI system
 * and generates detailed reports of the results.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { compareBenchmarks } = require('../tests/performance/benchmark-framework');

// Configuration
const CONFIG = {
  reportDir: process.env.BENCHMARK_REPORT_DIR || path.join(__dirname, '../benchmark-reports'),
  iterations: process.env.BENCHMARK_ITERATIONS || '50',
  warmupIterations: process.env.BENCHMARK_WARMUP_ITERATIONS || '5',
  testMode: process.argv[2] || 'all', // all, edge, backend, frontend, integration
  component: process.argv[3] || 'all', // all, translation, cache, sync, offline, etc.
  generateComparison: true,
  openReportInBrowser: true
};

// Benchmark configurations
const BENCHMARKS = {
  edge: {
    script: '../tests/performance/edge-benchmark.js',
    components: ['translation', 'cache', 'sync', 'offline', 'device', 'optimization']
  },
  backend: {
    script: '../tests/performance/backend-benchmark.js',
    components: ['translation', 'websocket', 'auth', 'storage']
  },
  integration: {
    script: '../tests/performance/integration-benchmark.js',
    components: ['full-flow', 'edge-fallback', 'offline-sync']
  }
};

/**
 * Run a benchmark script
 * 
 * @param {string} scriptPath - Path to the benchmark script
 * @param {string} component - Component to benchmark
 * @returns {Promise<Object>} - Benchmark result
 */
async function runBenchmark(scriptPath, component) {
  return new Promise((resolve, reject) => {
    console.log(`\nRunning benchmark: ${path.basename(scriptPath)} (${component})`);
    
    // Set environment variables
    const env = {
      ...process.env,
      BENCHMARK_ITERATIONS: CONFIG.iterations,
      BENCHMARK_WARMUP_ITERATIONS: CONFIG.warmupIterations,
      BENCHMARK_REPORT_DIR: CONFIG.reportDir
    };
    
    // Spawn benchmark process
    const benchmark = spawn('node', [scriptPath, component], {
      env,
      stdio: 'inherit'
    });
    
    benchmark.on('close', (code) => {
      if (code === 0) {
        console.log(`Benchmark ${path.basename(scriptPath)} (${component}) completed successfully`);
        resolve({ script: scriptPath, component, success: true });
      } else {
        console.error(`Benchmark ${path.basename(scriptPath)} (${component}) failed with exit code ${code}`);
        resolve({ script: scriptPath, component, success: false });
      }
    });
    
    benchmark.on('error', (error) => {
      console.error(`Error running benchmark ${path.basename(scriptPath)} (${component}):`, error.message);
      reject(error);
    });
  });
}

/**
 * Run all benchmarks
 * 
 * @returns {Promise<Array<Object>>} - Benchmark results
 */
async function runAllBenchmarks() {
  const results = [];
  
  // Create report directory if it doesn't exist
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
  }
  
  // Run edge benchmarks
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'edge') {
    const components = CONFIG.component === 'all' ? 
      BENCHMARKS.edge.components : 
      [CONFIG.component];
    
    for (const component of components) {
      if (BENCHMARKS.edge.components.includes(component)) {
        const result = await runBenchmark(
          path.join(__dirname, BENCHMARKS.edge.script),
          component
        );
        results.push(result);
      }
    }
  }
  
  // Run backend benchmarks
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'backend') {
    const components = CONFIG.component === 'all' ? 
      BENCHMARKS.backend.components : 
      [CONFIG.component];
    
    for (const component of components) {
      if (BENCHMARKS.backend.components.includes(component)) {
        const result = await runBenchmark(
          path.join(__dirname, BENCHMARKS.backend.script),
          component
        );
        results.push(result);
      }
    }
  }
  
  // Run integration benchmarks
  if (CONFIG.testMode === 'all' || CONFIG.testMode === 'integration') {
    const components = CONFIG.component === 'all' ? 
      BENCHMARKS.integration.components : 
      [CONFIG.component];
    
    for (const component of components) {
      if (BENCHMARKS.integration.components.includes(component)) {
        const result = await runBenchmark(
          path.join(__dirname, BENCHMARKS.integration.script),
          component
        );
        results.push(result);
      }
    }
  }
  
  return results;
}

/**
 * Generate comparison report
 * 
 * @param {Array<Object>} results - Benchmark results
 * @returns {Promise<string>} - Path to comparison report
 */
async function generateComparisonReport(results) {
  // Get all benchmark result files
  const benchmarkFiles = fs.readdirSync(CONFIG.reportDir)
    .filter(file => file.endsWith('.json') && !file.includes('comparison'))
    .map(file => path.join(CONFIG.reportDir, file));
  
  // Sort by timestamp (newest first)
  benchmarkFiles.sort((a, b) => {
    const aStats = fs.statSync(a);
    const bStats = fs.statSync(b);
    return bStats.mtime.getTime() - aStats.mtime.getTime();
  });
  
  // Get the most recent benchmark results
  const recentFiles = benchmarkFiles.slice(0, results.length);
  
  // Load benchmark results
  const benchmarkResults = recentFiles.map(file => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      console.error(`Error loading benchmark result from ${file}:`, error.message);
      return null;
    }
  }).filter(Boolean);
  
  // Generate comparison
  if (benchmarkResults.length > 1) {
    const comparison = compareBenchmarks(
      benchmarkResults,
      `MedTranslate AI Performance Benchmark Comparison (${new Date().toISOString()})`
    );
    
    return comparison.htmlPath;
  }
  
  return null;
}

/**
 * Open report in browser
 * 
 * @param {string} reportPath - Path to report
 */
function openReportInBrowser(reportPath) {
  const command = process.platform === 'win32' ? 'start' : 
                 process.platform === 'darwin' ? 'open' : 'xdg-open';
  
  spawn(command, [reportPath], { shell: true });
}

/**
 * Main function
 */
async function main() {
  console.log('Starting MedTranslate AI Performance Benchmarks');
  console.log(`Test mode: ${CONFIG.testMode}`);
  console.log(`Component: ${CONFIG.component}`);
  console.log(`Iterations: ${CONFIG.iterations}`);
  console.log(`Warmup iterations: ${CONFIG.warmupIterations}`);
  
  try {
    // Run benchmarks
    const results = await runAllBenchmarks();
    
    // Print summary
    console.log('\n=== Benchmark Summary ===');
    for (const result of results) {
      console.log(`${result.success ? '✅' : '❌'} ${path.basename(result.script)} (${result.component})`);
    }
    
    // Generate comparison report
    if (CONFIG.generateComparison && results.length > 1) {
      const comparisonPath = await generateComparisonReport(results);
      
      if (comparisonPath) {
        console.log(`\nComparison report generated: ${comparisonPath}`);
        
        // Open report in browser
        if (CONFIG.openReportInBrowser) {
          openReportInBrowser(comparisonPath);
        }
      }
    }
    
    console.log('\nPerformance benchmarks completed successfully');
  } catch (error) {
    console.error('Error running benchmarks:', error);
    process.exit(1);
  }
}

// Run the script
main();
