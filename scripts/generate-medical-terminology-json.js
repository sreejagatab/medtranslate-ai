/**
 * Generate Medical Terminology JSON Files for Edge Application
 * 
 * This script generates JSON files containing medical terminology for use in the edge application.
 * It reads from CSV files and creates language-specific JSON files.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Configuration
const DATA_DIR = path.join(__dirname, '../data/medical-terminology');
const OUTPUT_DIR = path.join(__dirname, '../edge/models');

// Language pairs to generate
const LANGUAGE_PAIRS = [
  { source: 'en', target: 'es' },
  { source: 'es', target: 'en' },
  { source: 'en', target: 'fr' },
  { source: 'fr', target: 'en' },
  { source: 'en', target: 'de' },
  { source: 'de', target: 'en' }
];

// Data sources
const DATA_SOURCES = [
  {
    name: 'UMLS',
    path: path.join(DATA_DIR, 'umls_sample.csv')
  },
  {
    name: 'MedlinePlus',
    path: path.join(DATA_DIR, 'medlineplus_sample.csv')
  },
  {
    name: 'SNOMED',
    path: path.join(DATA_DIR, 'snomed_sample.csv')
  }
];

/**
 * Load medical terminology from CSV file
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of terminology entries
 */
async function loadTerminologyFromCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      resolve([]);
      return;
    }

    // Read and parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

/**
 * Generate medical terminology JSON file for a language pair
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @param {Array} terminologyData - Terminology data
 */
function generateTerminologyJson(sourceLanguage, targetLanguage, terminologyData) {
  // Create directory for language pair
  const dirPath = path.join(OUTPUT_DIR, `${sourceLanguage}-${targetLanguage}`);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Filter terminology data for this language pair
  const filteredData = terminologyData.filter(item => 
    item.source_language === sourceLanguage && 
    item.target_language === targetLanguage
  );

  // Create terminology dictionary
  const terminology = {};
  for (const item of filteredData) {
    terminology[item.source_term] = item.target_term;
  }

  // Write to JSON file
  const filePath = path.join(dirPath, 'medical_terms.json');
  fs.writeFileSync(filePath, JSON.stringify(terminology, null, 2));

  // Create metadata file
  const metadata = {
    source_language: sourceLanguage,
    target_language: targetLanguage,
    term_count: Object.keys(terminology).length,
    created_at: new Date().toISOString(),
    version: '1.0.0'
  };

  const metadataPath = path.join(dirPath, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`Generated terminology file for ${sourceLanguage}-${targetLanguage} with ${Object.keys(terminology).length} terms`);
}

/**
 * Generate manifest file
 */
function generateManifest() {
  const models = [];

  // Scan model directories
  const dirs = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.includes('-'))
    .map(dirent => dirent.name);

  for (const dir of dirs) {
    const metadataPath = path.join(OUTPUT_DIR, dir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      models.push({
        id: dir,
        source_language: metadata.source_language,
        target_language: metadata.target_language,
        term_count: metadata.term_count,
        version: metadata.version,
        created_at: metadata.created_at
      });
    }
  }

  // Create manifest file
  const manifest = {
    models,
    total_models: models.length,
    generated_at: new Date().toISOString(),
    version: '1.0.0'
  };

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Generated manifest file with ${models.length} models`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting medical terminology JSON generation...');

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Load terminology data from all sources
    const allTerminologyData = [];
    for (const source of DATA_SOURCES) {
      console.log(`Loading terminology from ${source.name}...`);
      const data = await loadTerminologyFromCsv(source.path);
      console.log(`Loaded ${data.length} terms from ${source.name}`);
      allTerminologyData.push(...data);
    }

    console.log(`Total terminology data: ${allTerminologyData.length} terms`);

    // Generate terminology JSON files for each language pair
    for (const pair of LANGUAGE_PAIRS) {
      generateTerminologyJson(pair.source, pair.target, allTerminologyData);
    }

    // Generate manifest file
    generateManifest();

    console.log('Medical terminology JSON generation completed');
  } catch (error) {
    console.error('Error generating medical terminology JSON:', error);
  }
}

// Run the main function
main();
