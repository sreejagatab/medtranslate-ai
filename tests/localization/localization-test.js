/**
 * Localization Testing Tool for MedTranslate AI
 * 
 * This tool tests the localization implementation across all supported languages.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');

// Configuration
const config = {
  baseUrl: process.env.APP_URL || 'http://localhost:3000',
  outputDir: path.join(__dirname, '../../test-reports/localization'),
  screenshotsDir: path.join(__dirname, '../../test-reports/localization/screenshots'),
  translationsDir: path.join(__dirname, '../../frontend/shared/localization/translations')
};

// Supported languages (from i18n.js)
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false }
];

// Test screens to check
const TEST_SCREENS = [
  { name: 'Login', path: '/login' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Translation', path: '/translation' },
  { name: 'Settings', path: '/settings' },
  { name: 'Profile', path: '/profile' }
];

/**
 * Analyze translation files for completeness
 * 
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeTranslationFiles() {
  try {
    console.log('Analyzing translation files...');
    
    const results = {
      languages: {},
      missingKeys: {},
      summary: {
        totalLanguages: SUPPORTED_LANGUAGES.length,
        totalKeys: 0,
        completeLanguages: 0
      }
    };
    
    // Load English translations as reference
    const enTranslationsPath = path.join(config.translationsDir, 'en.json');
    const enTranslations = JSON.parse(fs.readFileSync(enTranslationsPath, 'utf8'));
    
    // Get all keys from English translations
    const allKeys = getAllKeys(enTranslations);
    results.summary.totalKeys = allKeys.length;
    
    // Check each language
    for (const language of SUPPORTED_LANGUAGES) {
      const langCode = language.code;
      const translationsPath = path.join(config.translationsDir, `${langCode}.json`);
      
      // Skip if translation file doesn't exist
      if (!fs.existsSync(translationsPath)) {
        results.languages[langCode] = {
          name: language.name,
          nativeName: language.nativeName,
          rtl: language.rtl,
          exists: false,
          keyCount: 0,
          missingCount: allKeys.length,
          completeness: 0
        };
        results.missingKeys[langCode] = allKeys;
        continue;
      }
      
      // Load translations
      const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
      
      // Check for missing keys
      const missingKeys = [];
      for (const key of allKeys) {
        if (!hasNestedKey(translations, key)) {
          missingKeys.push(key);
        }
      }
      
      // Calculate completeness
      const keyCount = allKeys.length - missingKeys.length;
      const completeness = Math.round((keyCount / allKeys.length) * 100);
      
      // Store results
      results.languages[langCode] = {
        name: language.name,
        nativeName: language.nativeName,
        rtl: language.rtl,
        exists: true,
        keyCount,
        missingCount: missingKeys.length,
        completeness
      };
      
      results.missingKeys[langCode] = missingKeys;
      
      // Update summary
      if (missingKeys.length === 0) {
        results.summary.completeLanguages++;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error analyzing translation files:', error);
    throw error;
  }
}

/**
 * Get all keys from a nested object
 * 
 * @param {Object} obj - Object to get keys from
 * @param {string} prefix - Key prefix
 * @returns {Array<string>} - All keys
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], newKey));
    } else {
      keys.push(newKey);
    }
  }
  
  return keys;
}

/**
 * Check if an object has a nested key
 * 
 * @param {Object} obj - Object to check
 * @param {string} key - Key to check
 * @returns {boolean} - Whether the key exists
 */
function hasNestedKey(obj, key) {
  const parts = key.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null || typeof current !== 'object') {
      return false;
    }
    
    current = current[part];
  }
  
  return current !== undefined;
}

/**
 * Take screenshots of the app in different languages
 * 
 * @returns {Promise<Object>} - Screenshot results
 */
async function takeScreenshots() {
  try {
    console.log('Taking screenshots...');
    
    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(config.screenshotsDir)) {
      fs.mkdirSync(config.screenshotsDir, { recursive: true });
    }
    
    const results = {
      screenshots: {},
      errors: {}
    };
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Test each language
    for (const language of SUPPORTED_LANGUAGES) {
      const langCode = language.code;
      console.log(`Testing language: ${language.name} (${langCode})`);
      
      results.screenshots[langCode] = [];
      results.errors[langCode] = [];
      
      // Create language directory
      const langDir = path.join(config.screenshotsDir, langCode);
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
      }
      
      // Test each screen
      for (const screen of TEST_SCREENS) {
        try {
          // Open new page
          const page = await browser.newPage();
          
          // Set viewport size
          await page.setViewport({
            width: 1280,
            height: 800
          });
          
          // Set language
          await page.setExtraHTTPHeaders({
            'Accept-Language': langCode
          });
          
          // Navigate to screen
          const url = `${config.baseUrl}${screen.path}?lang=${langCode}`;
          await page.goto(url, { waitUntil: 'networkidle2' });
          
          // Wait for content to load
          await page.waitForSelector('body', { timeout: 5000 });
          
          // Take screenshot
          const screenshotPath = path.join(langDir, `${screen.name.toLowerCase()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          
          // Store result
          results.screenshots[langCode].push({
            screen: screen.name,
            path: screenshotPath
          });
          
          // Close page
          await page.close();
        } catch (error) {
          console.error(`Error taking screenshot for ${screen.name} in ${language.name}:`, error);
          
          // Store error
          results.errors[langCode].push({
            screen: screen.name,
            error: error.message
          });
        }
      }
    }
    
    // Close browser
    await browser.close();
    
    return results;
  } catch (error) {
    console.error('Error taking screenshots:', error);
    throw error;
  }
}

/**
 * Test RTL layout
 * 
 * @returns {Promise<Object>} - RTL test results
 */
async function testRtlLayout() {
  try {
    console.log('Testing RTL layout...');
    
    const results = {
      rtlLanguages: SUPPORTED_LANGUAGES.filter(lang => lang.rtl),
      issues: {}
    };
    
    // Skip if no RTL languages
    if (results.rtlLanguages.length === 0) {
      console.log('No RTL languages to test.');
      return results;
    }
    
    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Test each RTL language
    for (const language of results.rtlLanguages) {
      const langCode = language.code;
      console.log(`Testing RTL layout for ${language.name} (${langCode})`);
      
      results.issues[langCode] = [];
      
      // Test each screen
      for (const screen of TEST_SCREENS) {
        try {
          // Open new page
          const page = await browser.newPage();
          
          // Set viewport size
          await page.setViewport({
            width: 1280,
            height: 800
          });
          
          // Set language
          await page.setExtraHTTPHeaders({
            'Accept-Language': langCode
          });
          
          // Navigate to screen
          const url = `${config.baseUrl}${screen.path}?lang=${langCode}`;
          await page.goto(url, { waitUntil: 'networkidle2' });
          
          // Wait for content to load
          await page.waitForSelector('body', { timeout: 5000 });
          
          // Check if body has RTL direction
          const isRtl = await page.evaluate(() => {
            const dir = document.documentElement.dir || document.body.dir;
            const style = window.getComputedStyle(document.body);
            const direction = style.getPropertyValue('direction');
            
            return dir === 'rtl' || direction === 'rtl';
          });
          
          if (!isRtl) {
            results.issues[langCode].push({
              screen: screen.name,
              issue: 'Page does not have RTL direction'
            });
          }
          
          // Check for common RTL issues
          const rtlIssues = await page.evaluate(() => {
            const issues = [];
            
            // Check for elements with explicit left/right positioning
            const elementsWithExplicitPosition = Array.from(document.querySelectorAll('*')).filter(el => {
              const style = window.getComputedStyle(el);
              return (
                style.position !== 'static' && 
                (style.left || style.right) &&
                !style.getPropertyValue('left').includes('auto') &&
                !style.getPropertyValue('right').includes('auto')
              );
            });
            
            if (elementsWithExplicitPosition.length > 0) {
              issues.push({
                type: 'explicit_positioning',
                count: elementsWithExplicitPosition.length,
                elements: elementsWithExplicitPosition.slice(0, 5).map(el => el.tagName + (el.className ? '.' + el.className.replace(/\s+/g, '.') : ''))
              });
            }
            
            // Check for elements with non-flipped margins/paddings
            const elementsWithNonFlippedSpacing = Array.from(document.querySelectorAll('*')).filter(el => {
              const style = window.getComputedStyle(el);
              return (
                style.marginLeft !== style.marginRight ||
                style.paddingLeft !== style.paddingRight
              );
            });
            
            if (elementsWithNonFlippedSpacing.length > 0) {
              issues.push({
                type: 'non_flipped_spacing',
                count: elementsWithNonFlippedSpacing.length,
                elements: elementsWithNonFlippedSpacing.slice(0, 5).map(el => el.tagName + (el.className ? '.' + el.className.replace(/\s+/g, '.') : ''))
              });
            }
            
            return issues;
          });
          
          if (rtlIssues.length > 0) {
            results.issues[langCode].push({
              screen: screen.name,
              issues: rtlIssues
            });
          }
          
          // Close page
          await page.close();
        } catch (error) {
          console.error(`Error testing RTL layout for ${screen.name} in ${language.name}:`, error);
          
          // Store error
          results.issues[langCode].push({
            screen: screen.name,
            error: error.message
          });
        }
      }
    }
    
    // Close browser
    await browser.close();
    
    return results;
  } catch (error) {
    console.error('Error testing RTL layout:', error);
    throw error;
  }
}

/**
 * Generate localization test report
 * 
 * @param {Object} analysisResults - Translation file analysis results
 * @param {Object} screenshotResults - Screenshot results
 * @param {Object} rtlResults - RTL test results
 * @returns {Promise<Object>} - Report paths
 */
async function generateReport(analysisResults, screenshotResults, rtlResults) {
  try {
    console.log('Generating localization test report...');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Generate report timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate JSON report
    const jsonReport = {
      timestamp,
      analysis: analysisResults,
      screenshots: screenshotResults,
      rtl: rtlResults
    };
    
    // Save JSON report
    const jsonReportPath = path.join(config.outputDir, `localization-test-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));
    
    // Generate HTML report
    let htmlReport = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MedTranslate AI Localization Test Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3 {
            color: #0077CC;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .summary-item {
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            flex: 1;
            margin: 0 5px;
          }
          .complete {
            background-color: #DFF0D8;
            color: #3C763D;
          }
          .incomplete {
            background-color: #F2DEDE;
            color: #A94442;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
          }
          .progress-bar {
            background-color: #f5f5f5;
            border-radius: 4px;
            height: 20px;
            width: 100%;
          }
          .progress {
            background-color: #0077CC;
            border-radius: 4px;
            height: 20px;
          }
          .rtl {
            background-color: #FCF8E3;
          }
          .screenshot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }
          .screenshot-item {
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
          }
          .screenshot-item img {
            width: 100%;
            height: auto;
          }
          .screenshot-caption {
            padding: 10px;
            background-color: #f5f5f5;
            text-align: center;
          }
          .issue-list {
            list-style-type: none;
            padding: 0;
          }
          .issue-item {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            background-color: #F2DEDE;
          }
        </style>
      </head>
      <body>
        <h1>MedTranslate AI Localization Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <h2>Translation Files Analysis</h2>
        <div class="summary">
          <div class="summary-item">
            <h3>Total Languages</h3>
            <p>${analysisResults.summary.totalLanguages}</p>
          </div>
          <div class="summary-item">
            <h3>Total Keys</h3>
            <p>${analysisResults.summary.totalKeys}</p>
          </div>
          <div class="summary-item ${analysisResults.summary.completeLanguages === analysisResults.summary.totalLanguages ? 'complete' : 'incomplete'}">
            <h3>Complete Languages</h3>
            <p>${analysisResults.summary.completeLanguages} / ${analysisResults.summary.totalLanguages}</p>
          </div>
        </div>
        
        <h3>Language Completeness</h3>
        <table>
          <tr>
            <th>Language</th>
            <th>Native Name</th>
            <th>RTL</th>
            <th>Exists</th>
            <th>Keys</th>
            <th>Missing</th>
            <th>Completeness</th>
          </tr>
    `;
    
    // Add language rows
    for (const langCode in analysisResults.languages) {
      const lang = analysisResults.languages[langCode];
      
      htmlReport += `
        <tr ${lang.rtl ? 'class="rtl"' : ''}>
          <td>${lang.name} (${langCode})</td>
          <td>${lang.nativeName}</td>
          <td>${lang.rtl ? 'Yes' : 'No'}</td>
          <td>${lang.exists ? 'Yes' : 'No'}</td>
          <td>${lang.keyCount} / ${analysisResults.summary.totalKeys}</td>
          <td>${lang.missingCount}</td>
          <td>
            <div class="progress-bar">
              <div class="progress" style="width: ${lang.completeness}%"></div>
            </div>
            ${lang.completeness}%
          </td>
        </tr>
      `;
    }
    
    htmlReport += `</table>`;
    
    // Add missing keys section
    htmlReport += `<h3>Missing Keys</h3>`;
    
    for (const langCode in analysisResults.missingKeys) {
      const missingKeys = analysisResults.missingKeys[langCode];
      const lang = analysisResults.languages[langCode];
      
      if (missingKeys.length === 0) {
        continue;
      }
      
      htmlReport += `
        <h4>${lang.name} (${langCode}) - ${missingKeys.length} missing keys</h4>
        <ul>
      `;
      
      for (const key of missingKeys.slice(0, 20)) {
        htmlReport += `<li>${key}</li>`;
      }
      
      if (missingKeys.length > 20) {
        htmlReport += `<li>... and ${missingKeys.length - 20} more</li>`;
      }
      
      htmlReport += `</ul>`;
    }
    
    // Add screenshots section
    htmlReport += `
      <h2>Screenshots</h2>
      <p>Screenshots were taken for each language and screen to verify the UI adaptation.</p>
    `;
    
    for (const langCode in screenshotResults.screenshots) {
      const screenshots = screenshotResults.screenshots[langCode];
      const lang = analysisResults.languages[langCode];
      
      if (screenshots.length === 0) {
        continue;
      }
      
      htmlReport += `
        <h3>${lang.name} (${langCode})</h3>
        <div class="screenshot-grid">
      `;
      
      for (const screenshot of screenshots) {
        const relativePath = path.relative(config.outputDir, screenshot.path).replace(/\\/g, '/');
        
        htmlReport += `
          <div class="screenshot-item">
            <img src="${relativePath}" alt="${screenshot.screen} in ${lang.name}">
            <div class="screenshot-caption">${screenshot.screen}</div>
          </div>
        `;
      }
      
      htmlReport += `</div>`;
      
      // Add errors
      const errors = screenshotResults.errors[langCode];
      
      if (errors && errors.length > 0) {
        htmlReport += `
          <h4>Errors</h4>
          <ul class="issue-list">
        `;
        
        for (const error of errors) {
          htmlReport += `
            <li class="issue-item">
              <strong>${error.screen}:</strong> ${error.error}
            </li>
          `;
        }
        
        htmlReport += `</ul>`;
      }
    }
    
    // Add RTL section
    if (rtlResults.rtlLanguages.length > 0) {
      htmlReport += `
        <h2>RTL Layout Testing</h2>
        <p>Testing the right-to-left layout for RTL languages.</p>
      `;
      
      for (const langCode in rtlResults.issues) {
        const issues = rtlResults.issues[langCode];
        const lang = analysisResults.languages[langCode];
        
        htmlReport += `<h3>${lang.name} (${langCode})</h3>`;
        
        if (issues.length === 0) {
          htmlReport += `<p>No RTL issues found.</p>`;
          continue;
        }
        
        htmlReport += `<ul class="issue-list">`;
        
        for (const issue of issues) {
          if (issue.error) {
            htmlReport += `
              <li class="issue-item">
                <strong>${issue.screen}:</strong> Error: ${issue.error}
              </li>
            `;
          } else if (issue.issue) {
            htmlReport += `
              <li class="issue-item">
                <strong>${issue.screen}:</strong> ${issue.issue}
              </li>
            `;
          } else if (issue.issues) {
            htmlReport += `
              <li class="issue-item">
                <strong>${issue.screen}:</strong>
                <ul>
            `;
            
            for (const rtlIssue of issue.issues) {
              htmlReport += `
                <li>
                  <strong>${rtlIssue.type}:</strong> ${rtlIssue.count} elements affected
                  <br>
                  Examples: ${rtlIssue.elements.join(', ')}
                </li>
              `;
            }
            
            htmlReport += `</ul></li>`;
          }
        }
        
        htmlReport += `</ul>`;
      }
    }
    
    htmlReport += `
      </body>
      </html>
    `;
    
    // Save HTML report
    const htmlReportPath = path.join(config.outputDir, `localization-test-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`Reports generated:`);
    console.log(`- JSON: ${jsonReportPath}`);
    console.log(`- HTML: ${htmlReportPath}`);
    
    return {
      jsonReportPath,
      htmlReportPath
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

/**
 * Run localization tests
 * 
 * @returns {Promise<Object>} - Test results
 */
async function runLocalizationTests() {
  try {
    console.log('Starting localization tests...');
    
    // Analyze translation files
    const analysisResults = await analyzeTranslationFiles();
    
    // Take screenshots
    const screenshotResults = await takeScreenshots();
    
    // Test RTL layout
    const rtlResults = await testRtlLayout();
    
    // Generate report
    const report = await generateReport(analysisResults, screenshotResults, rtlResults);
    
    console.log('Localization tests completed.');
    
    return {
      analysis: analysisResults,
      screenshots: screenshotResults,
      rtl: rtlResults,
      report
    };
  } catch (error) {
    console.error('Error running localization tests:', error);
    throw error;
  }
}

// Run localization tests if this file is executed directly
if (require.main === module) {
  runLocalizationTests()
    .then(({ analysis }) => {
      console.log('Localization test summary:');
      console.log(`- Total languages: ${analysis.summary.totalLanguages}`);
      console.log(`- Complete languages: ${analysis.summary.completeLanguages}`);
      console.log(`- Total keys: ${analysis.summary.totalKeys}`);
      
      // Exit with non-zero code if not all languages are complete
      process.exit(analysis.summary.completeLanguages < analysis.summary.totalLanguages ? 1 : 0);
    })
    .catch(error => {
      console.error('Localization tests failed:', error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = {
  analyzeTranslationFiles,
  takeScreenshots,
  testRtlLayout,
  generateReport,
  runLocalizationTests
};
