/**
 * Compression Utility for MedTranslate AI Edge Application
 *
 * This module provides functions for compressing and decompressing data
 * to optimize storage usage in the edge application's cache.
 */

const zlib = require('zlib');
const { promisify } = require('util');

// Promisify zlib functions
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);
const deflateAsync = promisify(zlib.deflate);
const inflateAsync = promisify(zlib.inflate);
const brotliCompressAsync = promisify(zlib.brotliCompress);
const brotliDecompressAsync = promisify(zlib.brotliDecompress);

// Compression levels
const COMPRESSION_LEVELS = {
  NONE: 0,
  FAST: 1,
  BALANCED: 5,
  MAX: 9
};

// Compression algorithms
const COMPRESSION_ALGORITHMS = {
  GZIP: 'gzip',
  DEFLATE: 'deflate',
  BROTLI: 'brotli'
};

/**
 * Compress data using the specified algorithm and level
 *
 * @param {Object|string} data - Data to compress
 * @param {string} algorithm - Compression algorithm to use
 * @param {number} level - Compression level
 * @returns {Promise<Object>} - Compressed data with metadata
 */
async function compressData(data, algorithm = COMPRESSION_ALGORITHMS.GZIP, level = COMPRESSION_LEVELS.BALANCED) {
  try {
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    const inputBuffer = Buffer.from(dataString, 'utf8');
    
    let compressedBuffer;
    
    // Compress using the specified algorithm
    switch (algorithm) {
      case COMPRESSION_ALGORITHMS.GZIP:
        compressedBuffer = await gzipAsync(inputBuffer, { level });
        break;
      case COMPRESSION_ALGORITHMS.DEFLATE:
        compressedBuffer = await deflateAsync(inputBuffer, { level });
        break;
      case COMPRESSION_ALGORITHMS.BROTLI:
        compressedBuffer = await brotliCompressAsync(inputBuffer, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: level
          }
        });
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }
    
    // Calculate compression ratio
    const compressionRatio = inputBuffer.length / compressedBuffer.length;
    
    return {
      data: compressedBuffer.toString('base64'),
      originalSize: inputBuffer.length,
      compressedSize: compressedBuffer.length,
      compressionRatio,
      algorithm,
      level,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error compressing data:', error);
    throw error;
  }
}

/**
 * Decompress data using the specified algorithm
 *
 * @param {Object} compressedData - Compressed data object
 * @returns {Promise<any>} - Decompressed data
 */
async function decompressData(compressedData) {
  try {
    const { data, algorithm } = compressedData;
    const compressedBuffer = Buffer.from(data, 'base64');
    
    let decompressedBuffer;
    
    // Decompress using the specified algorithm
    switch (algorithm) {
      case COMPRESSION_ALGORITHMS.GZIP:
        decompressedBuffer = await gunzipAsync(compressedBuffer);
        break;
      case COMPRESSION_ALGORITHMS.DEFLATE:
        decompressedBuffer = await inflateAsync(compressedBuffer);
        break;
      case COMPRESSION_ALGORITHMS.BROTLI:
        decompressedBuffer = await brotliDecompressAsync(compressedBuffer);
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }
    
    const decompressedString = decompressedBuffer.toString('utf8');
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(decompressedString);
    } catch (e) {
      // Return as string if not valid JSON
      return decompressedString;
    }
  } catch (error) {
    console.error('Error decompressing data:', error);
    throw error;
  }
}

/**
 * Determine the best compression algorithm and level based on data type and size
 *
 * @param {Object|string} data - Data to analyze
 * @param {Object} options - Compression options
 * @returns {Object} - Recommended compression settings
 */
function getOptimalCompressionSettings(data, options = {}) {
  // Convert data to string if it's an object
  const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
  const dataSize = Buffer.from(dataString, 'utf8').length;
  
  // Default settings
  const settings = {
    algorithm: COMPRESSION_ALGORITHMS.GZIP,
    level: COMPRESSION_LEVELS.BALANCED
  };
  
  // Adjust based on data size
  if (dataSize < 1024) { // Less than 1KB
    // For very small data, use fast compression
    settings.level = COMPRESSION_LEVELS.FAST;
  } else if (dataSize > 1024 * 1024) { // More than 1MB
    // For large data, use Brotli for better compression
    settings.algorithm = COMPRESSION_ALGORITHMS.BROTLI;
    settings.level = COMPRESSION_LEVELS.MAX;
  }
  
  // Adjust based on data type (if it's JSON)
  if (typeof data === 'object') {
    // JSON data compresses well with Brotli
    settings.algorithm = COMPRESSION_ALGORITHMS.BROTLI;
  }
  
  // Override with user options
  if (options.algorithm) {
    settings.algorithm = options.algorithm;
  }
  
  if (options.level !== undefined) {
    settings.level = options.level;
  }
  
  // Don't compress very small data
  if (dataSize < 100 && !options.forceCompression) {
    settings.algorithm = 'none';
    settings.level = 0;
  }
  
  return settings;
}

/**
 * Compress cache item for storage
 *
 * @param {Object} cacheItem - Cache item to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} - Compressed cache item
 */
async function compressCacheItem(cacheItem, options = {}) {
  try {
    // Skip compression if disabled
    if (options.disableCompression) {
      return {
        ...cacheItem,
        compressed: false
      };
    }
    
    // Get optimal compression settings
    const compressionSettings = getOptimalCompressionSettings(cacheItem, options);
    
    // Skip compression if algorithm is 'none'
    if (compressionSettings.algorithm === 'none') {
      return {
        ...cacheItem,
        compressed: false
      };
    }
    
    // Compress the cache item
    const compressedData = await compressData(
      cacheItem,
      compressionSettings.algorithm,
      compressionSettings.level
    );
    
    return {
      data: compressedData.data,
      originalSize: compressedData.originalSize,
      compressedSize: compressedData.compressedSize,
      compressionRatio: compressedData.compressionRatio,
      algorithm: compressedData.algorithm,
      compressed: true,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error compressing cache item:', error);
    
    // Return original item if compression fails
    return {
      ...cacheItem,
      compressed: false
    };
  }
}

/**
 * Decompress cache item for use
 *
 * @param {Object} compressedCacheItem - Compressed cache item
 * @returns {Promise<Object>} - Decompressed cache item
 */
async function decompressCacheItem(compressedCacheItem) {
  try {
    // Skip decompression if not compressed
    if (!compressedCacheItem.compressed) {
      return compressedCacheItem;
    }
    
    // Decompress the cache item
    return await decompressData(compressedCacheItem);
  } catch (error) {
    console.error('Error decompressing cache item:', error);
    throw error;
  }
}

module.exports = {
  compressData,
  decompressData,
  compressCacheItem,
  decompressCacheItem,
  getOptimalCompressionSettings,
  COMPRESSION_ALGORITHMS,
  COMPRESSION_LEVELS
};
