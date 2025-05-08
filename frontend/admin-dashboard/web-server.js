/**
 * MedTranslate AI Admin Dashboard Web Server
 *
 * This script starts a simple Express server to serve the admin dashboard.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Set port - explicitly using 4005 to avoid conflicts with 3000 and 3001
const PORT = 4005;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`[Admin Dashboard] Admin Dashboard web server running on port ${PORT}`);
  console.log(`[Admin Dashboard] Access the admin dashboard at http://localhost:${PORT}`);
});
