/**
 * Generate a simple app icon for testing
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a 1024x1024 canvas
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Fill background
ctx.fillStyle = '#0077CC';
ctx.fillRect(0, 0, 1024, 1024);

// Draw a simple icon
ctx.fillStyle = '#FFFFFF';
ctx.beginPath();
ctx.arc(512, 512, 400, 0, 2 * Math.PI);
ctx.fill();

// Add text
ctx.fillStyle = '#0077CC';
ctx.font = 'bold 120px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('MedTrans', 512, 450);
ctx.fillText('AI', 512, 580);

// Save the image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'assets', 'app-icon.png'), buffer);

console.log('App icon generated successfully!');
