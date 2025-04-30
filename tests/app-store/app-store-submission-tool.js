/**
 * App Store Submission Tool for MedTranslate AI
 * 
 * This tool helps prepare assets and verify requirements for app store submission.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp'); // For image processing

// Configuration
const config = {
  outputDir: path.join(__dirname, '../../test-reports/app-store'),
  assetsDir: path.join(__dirname, '../../assets'),
  mobileDir: path.join(__dirname, '../../mobile'),
  checklistPath: path.join(__dirname, '../../docs/app-store/app-store-submission-guide.md'),
  appName: 'MedTranslate AI',
  appVersion: '1.0.0',
  buildNumber: '1'
};

// iOS icon sizes
const IOS_ICON_SIZES = [
  { size: 1024, name: 'app-store' },
  { size: 180, name: 'iphone-60@3x' },
  { size: 167, name: 'ipad-83.5@2x' },
  { size: 152, name: 'ipad-76@2x' },
  { size: 120, name: 'iphone-60@2x' },
  { size: 87, name: 'iphone-29@3x' },
  { size: 80, name: 'iphone-40@2x' },
  { size: 76, name: 'ipad-76' },
  { size: 60, name: 'iphone-20@3x' },
  { size: 58, name: 'iphone-29@2x' },
  { size: 40, name: 'iphone-20@2x' },
  { size: 29, name: 'iphone-29' }
];

// Android icon sizes
const ANDROID_ICON_SIZES = [
  { size: 512, name: 'play-store' },
  { size: 192, name: 'xxxhdpi' },
  { size: 144, name: 'xxhdpi' },
  { size: 96, name: 'xhdpi' },
  { size: 72, name: 'hdpi' },
  { size: 48, name: 'mdpi' },
  { size: 36, name: 'ldpi' }
];

// Screenshot specifications
const SCREENSHOT_SPECS = {
  ios: [
    { name: 'iphone-6.5', width: 1242, height: 2688, description: 'iPhone 6.5" Display (iPhone 11 Pro Max, iPhone XS Max)' },
    { name: 'iphone-5.5', width: 1242, height: 2208, description: 'iPhone 5.5" Display (iPhone 8 Plus, iPhone 7 Plus)' },
    { name: 'ipad-12.9', width: 2048, height: 2732, description: 'iPad Pro 12.9"' },
    { name: 'ipad-11', width: 1668, height: 2388, description: 'iPad Pro 11"' }
  ],
  android: [
    { name: 'phone', width: 1080, height: 1920, description: 'Phone (16:9 aspect ratio)' },
    { name: 'tablet-7', width: 1080, height: 1920, description: '7-inch Tablet (16:9 aspect ratio)' },
    { name: 'tablet-10', width: 1080, height: 1920, description: '10-inch Tablet (16:9 aspect ratio)' }
  ]
};

/**
 * Generate app icons for iOS and Android
 * 
 * @param {string} sourceIconPath - Path to source icon (1024x1024)
 * @returns {Promise<Object>} - Generated icon paths
 */
async function generateAppIcons(sourceIconPath) {
  try {
    console.log('Generating app icons...');
    
    // Create output directories
    const iosIconsDir = path.join(config.outputDir, 'icons/ios');
    const androidIconsDir = path.join(config.outputDir, 'icons/android');
    
    if (!fs.existsSync(iosIconsDir)) {
      fs.mkdirSync(iosIconsDir, { recursive: true });
    }
    
    if (!fs.existsSync(androidIconsDir)) {
      fs.mkdirSync(androidIconsDir, { recursive: true });
    }
    
    // Check if source icon exists
    if (!fs.existsSync(sourceIconPath)) {
      throw new Error(`Source icon not found: ${sourceIconPath}`);
    }
    
    // Generate iOS icons
    const iosIcons = [];
    for (const icon of IOS_ICON_SIZES) {
      const outputPath = path.join(iosIconsDir, `icon-${icon.name}.png`);
      
      await sharp(sourceIconPath)
        .resize(icon.size, icon.size)
        .toFile(outputPath);
      
      iosIcons.push({
        size: icon.size,
        name: icon.name,
        path: outputPath
      });
      
      console.log(`Generated iOS icon: ${icon.size}x${icon.size} (${icon.name})`);
    }
    
    // Generate Android icons
    const androidIcons = [];
    for (const icon of ANDROID_ICON_SIZES) {
      const outputPath = path.join(androidIconsDir, `icon-${icon.name}.png`);
      
      await sharp(sourceIconPath)
        .resize(icon.size, icon.size)
        .toFile(outputPath);
      
      androidIcons.push({
        size: icon.size,
        name: icon.name,
        path: outputPath
      });
      
      console.log(`Generated Android icon: ${icon.size}x${icon.size} (${icon.name})`);
    }
    
    return {
      ios: iosIcons,
      android: androidIcons
    };
  } catch (error) {
    console.error('Error generating app icons:', error);
    throw error;
  }
}

/**
 * Prepare screenshot templates
 * 
 * @returns {Promise<Object>} - Screenshot template paths
 */
async function prepareScreenshotTemplates() {
  try {
    console.log('Preparing screenshot templates...');
    
    // Create output directories
    const iosScreenshotsDir = path.join(config.outputDir, 'screenshots/ios');
    const androidScreenshotsDir = path.join(config.outputDir, 'screenshots/android');
    
    if (!fs.existsSync(iosScreenshotsDir)) {
      fs.mkdirSync(iosScreenshotsDir, { recursive: true });
    }
    
    if (!fs.existsSync(androidScreenshotsDir)) {
      fs.mkdirSync(androidScreenshotsDir, { recursive: true });
    }
    
    // Generate screenshot templates
    const templates = {
      ios: [],
      android: []
    };
    
    // iOS screenshot templates
    for (const spec of SCREENSHOT_SPECS.ios) {
      const templatePath = path.join(iosScreenshotsDir, `template-${spec.name}.png`);
      
      // Create a blank template with device frame
      await sharp({
        create: {
          width: spec.width,
          height: spec.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .composite([
          {
            input: Buffer.from(
              `<svg width="${spec.width}" height="${spec.height}">
                <rect x="0" y="0" width="${spec.width}" height="${spec.height}" fill="#f5f5f5" />
                <text x="${spec.width / 2}" y="${spec.height / 2}" font-family="Arial" font-size="24" text-anchor="middle" fill="#999999">
                  ${spec.description} (${spec.width}x${spec.height})
                </text>
                <text x="${spec.width / 2}" y="${spec.height / 2 + 40}" font-family="Arial" font-size="18" text-anchor="middle" fill="#999999">
                  Replace with actual screenshot
                </text>
              </svg>`
            ),
            top: 0,
            left: 0
          }
        ])
        .toFile(templatePath);
      
      templates.ios.push({
        name: spec.name,
        width: spec.width,
        height: spec.height,
        description: spec.description,
        path: templatePath
      });
      
      console.log(`Generated iOS screenshot template: ${spec.name} (${spec.width}x${spec.height})`);
    }
    
    // Android screenshot templates
    for (const spec of SCREENSHOT_SPECS.android) {
      const templatePath = path.join(androidScreenshotsDir, `template-${spec.name}.png`);
      
      // Create a blank template with device frame
      await sharp({
        create: {
          width: spec.width,
          height: spec.height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .composite([
          {
            input: Buffer.from(
              `<svg width="${spec.width}" height="${spec.height}">
                <rect x="0" y="0" width="${spec.width}" height="${spec.height}" fill="#f5f5f5" />
                <text x="${spec.width / 2}" y="${spec.height / 2}" font-family="Arial" font-size="24" text-anchor="middle" fill="#999999">
                  ${spec.description} (${spec.width}x${spec.height})
                </text>
                <text x="${spec.width / 2}" y="${spec.height / 2 + 40}" font-family="Arial" font-size="18" text-anchor="middle" fill="#999999">
                  Replace with actual screenshot
                </text>
              </svg>`
            ),
            top: 0,
            left: 0
          }
        ])
        .toFile(templatePath);
      
      templates.android.push({
        name: spec.name,
        width: spec.width,
        height: spec.height,
        description: spec.description,
        path: templatePath
      });
      
      console.log(`Generated Android screenshot template: ${spec.name} (${spec.width}x${spec.height})`);
    }
    
    return templates;
  } catch (error) {
    console.error('Error preparing screenshot templates:', error);
    throw error;
  }
}

/**
 * Verify app metadata
 * 
 * @returns {Promise<Object>} - Verification results
 */
async function verifyAppMetadata() {
  try {
    console.log('Verifying app metadata...');
    
    const results = {
      ios: {
        name: true,
        description: true,
        keywords: true,
        privacyPolicy: false,
        termsOfService: false,
        supportUrl: false
      },
      android: {
        name: true,
        shortDescription: true,
        fullDescription: true,
        privacyPolicy: false,
        contactDetails: false
      }
    };
    
    // Check for privacy policy
    try {
      const privacyPolicyPath = path.join(config.mobileDir, 'privacy-policy.html');
      if (fs.existsSync(privacyPolicyPath)) {
        results.ios.privacyPolicy = true;
        results.android.privacyPolicy = true;
      }
    } catch (error) {
      console.warn('Error checking privacy policy:', error);
    }
    
    // Check for terms of service
    try {
      const termsOfServicePath = path.join(config.mobileDir, 'terms-of-service.html');
      if (fs.existsSync(termsOfServicePath)) {
        results.ios.termsOfService = true;
      }
    } catch (error) {
      console.warn('Error checking terms of service:', error);
    }
    
    // Check for support URL
    try {
      const supportPath = path.join(config.mobileDir, 'support.html');
      if (fs.existsSync(supportPath)) {
        results.ios.supportUrl = true;
      }
    } catch (error) {
      console.warn('Error checking support URL:', error);
    }
    
    // Check for contact details
    try {
      const contactPath = path.join(config.mobileDir, 'contact.html');
      if (fs.existsSync(contactPath)) {
        results.android.contactDetails = true;
      }
    } catch (error) {
      console.warn('Error checking contact details:', error);
    }
    
    return results;
  } catch (error) {
    console.error('Error verifying app metadata:', error);
    throw error;
  }
}

/**
 * Verify app binaries
 * 
 * @returns {Promise<Object>} - Verification results
 */
async function verifyAppBinaries() {
  try {
    console.log('Verifying app binaries...');
    
    const results = {
      ios: {
        exists: false,
        validArchive: false
      },
      android: {
        exists: false,
        validBundle: false
      }
    };
    
    // Check for iOS binary
    try {
      const iosBuildDir = path.join(config.mobileDir, 'ios/build');
      if (fs.existsSync(iosBuildDir)) {
        results.ios.exists = true;
        
        // Check for valid archive
        const archiveDir = path.join(iosBuildDir, 'archive');
        if (fs.existsSync(archiveDir)) {
          results.ios.validArchive = true;
        }
      }
    } catch (error) {
      console.warn('Error checking iOS binary:', error);
    }
    
    // Check for Android binary
    try {
      const androidBuildDir = path.join(config.mobileDir, 'android/app/build/outputs');
      if (fs.existsSync(androidBuildDir)) {
        results.android.exists = true;
        
        // Check for valid bundle
        const bundleDir = path.join(androidBuildDir, 'bundle/release');
        if (fs.existsSync(bundleDir)) {
          results.android.validBundle = true;
        }
      }
    } catch (error) {
      console.warn('Error checking Android binary:', error);
    }
    
    return results;
  } catch (error) {
    console.error('Error verifying app binaries:', error);
    throw error;
  }
}

/**
 * Generate submission checklist
 * 
 * @param {Object} verificationResults - Verification results
 * @returns {Promise<string>} - Checklist path
 */
async function generateSubmissionChecklist(verificationResults) {
  try {
    console.log('Generating submission checklist...');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Generate checklist timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate checklist content
    let checklistContent = `# MedTranslate AI App Store Submission Checklist
Generated: ${new Date().toLocaleString()}

## App Information
- App Name: ${config.appName}
- Version: ${config.appVersion}
- Build Number: ${config.buildNumber}

## iOS App Store Submission

### App Metadata
- App Name: ${verificationResults.metadata.ios.name ? '✅ Ready' : '❌ Missing'}
- App Description: ${verificationResults.metadata.ios.description ? '✅ Ready' : '❌ Missing'}
- Keywords: ${verificationResults.metadata.ios.keywords ? '✅ Ready' : '❌ Missing'}
- Privacy Policy: ${verificationResults.metadata.ios.privacyPolicy ? '✅ Ready' : '❌ Missing'}
- Terms of Service: ${verificationResults.metadata.ios.termsOfService ? '✅ Ready' : '❌ Missing'}
- Support URL: ${verificationResults.metadata.ios.supportUrl ? '✅ Ready' : '❌ Missing'}

### App Binary
- Binary Exists: ${verificationResults.binaries.ios.exists ? '✅ Yes' : '❌ No'}
- Valid Archive: ${verificationResults.binaries.ios.validArchive ? '✅ Yes' : '❌ No'}

### App Assets
- App Icons: ${verificationResults.icons.ios.length > 0 ? `✅ Generated (${verificationResults.icons.ios.length} sizes)` : '❌ Missing'}
- Screenshots: ${verificationResults.screenshots.ios.length > 0 ? `✅ Templates Ready (${verificationResults.screenshots.ios.length} sizes)` : '❌ Missing'}

## Google Play Store Submission

### App Metadata
- App Name: ${verificationResults.metadata.android.name ? '✅ Ready' : '❌ Missing'}
- Short Description: ${verificationResults.metadata.android.shortDescription ? '✅ Ready' : '❌ Missing'}
- Full Description: ${verificationResults.metadata.android.fullDescription ? '✅ Ready' : '❌ Missing'}
- Privacy Policy: ${verificationResults.metadata.android.privacyPolicy ? '✅ Ready' : '❌ Missing'}
- Contact Details: ${verificationResults.metadata.android.contactDetails ? '✅ Ready' : '❌ Missing'}

### App Binary
- Binary Exists: ${verificationResults.binaries.android.exists ? '✅ Yes' : '❌ No'}
- Valid Bundle: ${verificationResults.binaries.android.validBundle ? '✅ Yes' : '❌ No'}

### App Assets
- App Icons: ${verificationResults.icons.android.length > 0 ? `✅ Generated (${verificationResults.icons.android.length} sizes)` : '❌ Missing'}
- Screenshots: ${verificationResults.screenshots.android.length > 0 ? `✅ Templates Ready (${verificationResults.screenshots.android.length} sizes)` : '❌ Missing'}

## Submission Readiness

### iOS App Store
${
  verificationResults.metadata.ios.name &&
  verificationResults.metadata.ios.description &&
  verificationResults.metadata.ios.keywords &&
  verificationResults.metadata.ios.privacyPolicy &&
  verificationResults.metadata.ios.termsOfService &&
  verificationResults.metadata.ios.supportUrl &&
  verificationResults.binaries.ios.exists &&
  verificationResults.binaries.ios.validArchive &&
  verificationResults.icons.ios.length > 0 &&
  verificationResults.screenshots.ios.length > 0
    ? '✅ Ready for submission'
    : '❌ Not ready for submission (see issues above)'
}

### Google Play Store
${
  verificationResults.metadata.android.name &&
  verificationResults.metadata.android.shortDescription &&
  verificationResults.metadata.android.fullDescription &&
  verificationResults.metadata.android.privacyPolicy &&
  verificationResults.metadata.android.contactDetails &&
  verificationResults.binaries.android.exists &&
  verificationResults.binaries.android.validBundle &&
  verificationResults.icons.android.length > 0 &&
  verificationResults.screenshots.android.length > 0
    ? '✅ Ready for submission'
    : '❌ Not ready for submission (see issues above)'
}

## Next Steps

1. Replace screenshot templates with actual screenshots
2. Review app metadata for accuracy
3. Test app binaries on actual devices
4. Submit to app stores
5. Monitor submission status
`;
    
    // Save checklist
    const checklistPath = path.join(config.outputDir, `submission-checklist-${timestamp}.md`);
    fs.writeFileSync(checklistPath, checklistContent);
    
    console.log(`Submission checklist generated: ${checklistPath}`);
    
    return checklistPath;
  } catch (error) {
    console.error('Error generating submission checklist:', error);
    throw error;
  }
}

/**
 * Run app store submission preparation
 * 
 * @param {Object} options - Preparation options
 * @returns {Promise<Object>} - Preparation results
 */
async function runAppStorePreparation(options = {}) {
  try {
    console.log('Starting app store submission preparation...');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Set source icon path
    const sourceIconPath = options.sourceIconPath || path.join(config.assetsDir, 'app-icon.png');
    
    // Generate app icons
    const icons = await generateAppIcons(sourceIconPath);
    
    // Prepare screenshot templates
    const screenshots = await prepareScreenshotTemplates();
    
    // Verify app metadata
    const metadata = await verifyAppMetadata();
    
    // Verify app binaries
    const binaries = await verifyAppBinaries();
    
    // Generate submission checklist
    const checklistPath = await generateSubmissionChecklist({
      icons,
      screenshots,
      metadata,
      binaries
    });
    
    console.log('App store submission preparation completed.');
    
    return {
      icons,
      screenshots,
      metadata,
      binaries,
      checklistPath
    };
  } catch (error) {
    console.error('Error running app store preparation:', error);
    throw error;
  }
}

// Run app store preparation if this file is executed directly
if (require.main === module) {
  runAppStorePreparation()
    .then(results => {
      console.log('App store preparation summary:');
      console.log(`- iOS Icons: ${results.icons.ios.length} sizes`);
      console.log(`- Android Icons: ${results.icons.android.length} sizes`);
      console.log(`- iOS Screenshot Templates: ${results.screenshots.ios.length} sizes`);
      console.log(`- Android Screenshot Templates: ${results.screenshots.android.length} sizes`);
      console.log(`- Checklist: ${results.checklistPath}`);
    })
    .catch(error => {
      console.error('App store preparation failed:', error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = {
  generateAppIcons,
  prepareScreenshotTemplates,
  verifyAppMetadata,
  verifyAppBinaries,
  generateSubmissionChecklist,
  runAppStorePreparation
};
