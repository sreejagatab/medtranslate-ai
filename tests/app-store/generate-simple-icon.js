/**
 * Generate a simple app icon for testing
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create a 1024x1024 solid color image
const iconSize = 1024;
const iconPath = path.join(__dirname, '../../assets/app-icon.png');

// Create a solid blue square
sharp({
  create: {
    width: iconSize,
    height: iconSize,
    channels: 4,
    background: { r: 0, g: 119, b: 204, alpha: 1 }
  }
})
  .png()
  .toFile(iconPath)
  .then(() => {
    console.log(`Created simple app icon at: ${iconPath}`);
  })
  .catch(err => {
    console.error('Error creating app icon:', err);
  });
