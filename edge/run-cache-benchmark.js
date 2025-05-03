/**
 * Run Cache Performance Benchmarks
 * 
 * This script runs the performance benchmarks for the predictive caching system.
 */

const { runAllBenchmarks } = require('./tools/cache-benchmark');

console.log('Running Cache Performance Benchmarks...');

runAllBenchmarks()
  .then(() => {
    console.log('\n✅ Benchmarks completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error running benchmarks:', error);
    process.exit(1);
  });
