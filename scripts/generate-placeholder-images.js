/**
 * Generate Placeholder Images for MedTranslate AI Patient App
 * 
 * This script generates placeholder PNG images for the patient app.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Configuration
const ASSETS_DIR = path.join(__dirname, '../mobile/patient-app/src/assets');
const IMAGES = [
  {
    name: 'logo.png',
    width: 200,
    height: 200,
    draw: (ctx, width, height) => {
      // Background circle
      ctx.fillStyle = '#0077CC';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.45, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner circle
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.35, 0, Math.PI * 2);
      ctx.fill();
      
      // Center circle
      ctx.fillStyle = '#0077CC';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, width * 0.25, 0, Math.PI * 2);
      ctx.fill();
      
      // Medical cross
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(width * 0.425, width * 0.3, width * 0.15, width * 0.4);
      ctx.fillRect(width * 0.3, width * 0.425, width * 0.4, width * 0.15);
      
      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MT', width / 2, height / 2);
    }
  },
  {
    name: 'welcome-1.png',
    width: 400,
    height: 300,
    draw: (ctx, width, height) => {
      // Background
      ctx.fillStyle = '#E3F2FD';
      ctx.fillRect(0, 0, width, height);
      
      // Circle
      ctx.fillStyle = '#0077CC';
      ctx.beginPath();
      ctx.arc(width / 2, height / 3, height / 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Welcome', width / 2, height / 3);
      
      // Lines
      ctx.fillStyle = '#90CAF9';
      ctx.fillRect(width * 0.3, height * 0.6, width * 0.4, height * 0.07);
      ctx.fillRect(width * 0.35, height * 0.7, width * 0.3, height * 0.07);
      ctx.fillRect(width * 0.4, height * 0.8, width * 0.2, height * 0.07);
    }
  },
  {
    name: 'welcome-2.png',
    width: 400,
    height: 300,
    draw: (ctx, width, height) => {
      // Background
      ctx.fillStyle = '#BBDEFB';
      ctx.fillRect(0, 0, width, height);
      
      // Rectangle
      ctx.fillStyle = '#0077CC';
      ctx.fillRect(width * 0.25, height * 0.27, width * 0.5, height * 0.47);
      
      // Inner rectangle
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(width * 0.3, height * 0.33, width * 0.4, height * 0.33);
      
      // Circle
      ctx.fillStyle = '#90CAF9';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, height / 10, 0, Math.PI * 2);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#0077CC';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Join', width / 2, height / 2);
      
      ctx.fillStyle = '#0077CC';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Join Translation Sessions', width / 2, height * 0.83);
    }
  },
  {
    name: 'welcome-3.png',
    width: 400,
    height: 300,
    draw: (ctx, width, height) => {
      // Background
      ctx.fillStyle = '#90CAF9';
      ctx.fillRect(0, 0, width, height);
      
      // Circles
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(width * 0.375, height * 0.4, height / 7.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#0077CC';
      ctx.beginPath();
      ctx.arc(width * 0.625, height * 0.4, height / 7.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Curved lines
      ctx.strokeStyle = '#0077CC';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(width * 0.375, height * 0.6);
      ctx.quadraticCurveTo(width * 0.5, height * 0.73, width * 0.625, height * 0.6);
      ctx.stroke();
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(width * 0.375, height * 0.63);
      ctx.quadraticCurveTo(width * 0.5, height * 0.77, width * 0.625, height * 0.63);
      ctx.stroke();
      
      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Voice & Text Translation', width / 2, height * 0.83);
    }
  },
  {
    name: 'welcome-4.png',
    width: 400,
    height: 300,
    draw: (ctx, width, height) => {
      // Background
      ctx.fillStyle = '#64B5F6';
      ctx.fillRect(0, 0, width, height);
      
      // Rectangle
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(width * 0.3, height * 0.27, width * 0.4, height * 0.4);
      
      // Lines
      ctx.fillStyle = '#0077CC';
      ctx.fillRect(width * 0.35, height * 0.33, width * 0.3, height * 0.07);
      ctx.fillRect(width * 0.35, height * 0.43, width * 0.3, height * 0.07);
      ctx.fillRect(width * 0.35, height * 0.53, width * 0.3, height * 0.07);
      
      // Arrows
      ctx.fillStyle = '#0077CC';
      ctx.beginPath();
      ctx.moveTo(width * 0.8, height * 0.5);
      ctx.lineTo(width * 0.7, height * 0.43);
      ctx.lineTo(width * 0.7, height * 0.57);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(width * 0.2, height * 0.5);
      ctx.lineTo(width * 0.3, height * 0.43);
      ctx.lineTo(width * 0.3, height * 0.57);
      ctx.fill();
      
      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Works Offline', width / 2, height * 0.83);
    }
  }
];

// Create assets directory if it doesn't exist
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Generate images
IMAGES.forEach(image => {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  // Draw the image
  image.draw(ctx, image.width, image.height);
  
  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ASSETS_DIR, image.name), buffer);
  
  console.log(`Generated ${image.name}`);
});

console.log('All placeholder images generated successfully!');
console.log(`Images saved to: ${ASSETS_DIR}`);
