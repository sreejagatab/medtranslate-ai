/**
 * Simple web server for the Patient App
 */

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3004;

// Serve static HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MedTranslate AI - Patient App</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f7fa;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          background-color: #4CAF50;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .card {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
          padding: 20px;
        }
        .btn {
          background-color: #4CAF50;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 10px 20px;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          margin: 10px 0;
          width: 100%;
        }
        .btn:hover {
          background-color: #3e8e41;
        }
        .language-option {
          display: flex;
          align-items: center;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 10px;
          cursor: pointer;
        }
        .language-option:hover {
          background-color: #f0f0f0;
        }
        .language-option.selected {
          border-color: #4CAF50;
          background-color: #e8f5e9;
        }
        .language-flag {
          width: 30px;
          height: 20px;
          margin-right: 10px;
          background-color: #ddd;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>MedTranslate AI</h1>
        <p>Patient Application</p>
      </header>
      
      <div class="container">
        <!-- Welcome Screen -->
        <div id="welcomeScreen" class="card">
          <h2>Welcome to MedTranslate AI</h2>
          <p>This application helps you communicate with your healthcare provider in your preferred language.</p>
          <p>Please select your language to continue.</p>
          <button class="btn" onclick="showLanguageSelection()">Get Started</button>
        </div>
        
        <!-- Language Selection Screen -->
        <div id="languageSelectionScreen" style="display: none;">
          <div class="card">
            <h2>Select Your Language</h2>
            <div id="languageOptions">
              <div class="language-option" onclick="selectLanguage('es', 'Spanish')">
                <div class="language-flag">🇪🇸</div>
                <div>Spanish (Español)</div>
              </div>
              <div class="language-option" onclick="selectLanguage('zh', 'Mandarin')">
                <div class="language-flag">🇨🇳</div>
                <div>Mandarin (普通话)</div>
              </div>
              <div class="language-option" onclick="selectLanguage('ar', 'Arabic')">
                <div class="language-flag">🇸🇦</div>
                <div>Arabic (العربية)</div>
              </div>
              <div class="language-option" onclick="selectLanguage('fr', 'French')">
                <div class="language-flag">🇫🇷</div>
                <div>French (Français)</div>
              </div>
              <div class="language-option" onclick="selectLanguage('ru', 'Russian')">
                <div class="language-flag">🇷🇺</div>
                <div>Russian (Русский)</div>
              </div>
            </div>
            <button id="continueBtn" class="btn" style="display: none;" onclick="showSessionCodeEntry()">Continue</button>
          </div>
        </div>
        
        <!-- Session Code Entry Screen -->
        <div id="sessionCodeEntryScreen" style="display: none;">
          <div class="card">
            <h2>Enter Session Code</h2>
            <p>Please enter the 6-digit code provided by your healthcare provider.</p>
            <div style="display: flex; justify-content: center; margin: 20px 0;">
              <input type="text" id="sessionCode" maxlength="6" style="font-size: 24px; padding: 10px; width: 200px; text-align: center; letter-spacing: 5px;">
            </div>
            <button class="btn" onclick="joinSession()">Join Session</button>
          </div>
        </div>
        
        <!-- Translation Session Screen -->
        <div id="translationSessionScreen" style="display: none;">
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2>Medical Translation</h2>
              <div style="background-color: #4CAF50; color: white; padding: 5px 10px; border-radius: 4px;">
                <span id="selectedLanguageDisplay">Spanish</span>
              </div>
            </div>
            
            <div style="background-color: #f5f7fa; border-radius: 8px; padding: 20px; height: 300px; overflow-y: auto; margin-bottom: 20px;">
              <div style="margin-bottom: 15px;">
                <div style="background-color: #4CAF50; color: white; border-radius: 18px 18px 18px 0; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  <div><em>Original (English):</em> Hello, how are you feeling today?</div>
                  <div><strong>Translation:</strong> Hola, ¿cómo te sientes hoy?</div>
                </div>
              </div>
              
              <div style="margin-bottom: 15px; text-align: right;">
                <div style="background-color: #e5e5ea; border-radius: 18px 18px 0 18px; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  Me duele la cabeza y tengo fiebre.
                </div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <div style="background-color: #4CAF50; color: white; border-radius: 18px 18px 18px 0; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  <div><em>Original (English):</em> How long have you had these symptoms?</div>
                  <div><strong>Translation:</strong> ¿Cuánto tiempo has tenido estos síntomas?</div>
                </div>
              </div>
              
              <div style="margin-bottom: 15px; text-align: right;">
                <div style="background-color: #e5e5ea; border-radius: 18px 18px 0 18px; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  Desde ayer por la tarde. También tengo dolor de garganta.
                </div>
              </div>
            </div>
            
            <div style="display: flex;">
              <input type="text" placeholder="Type your message in Spanish..." style="flex-grow: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;">
              <button class="btn" style="width: auto;">Send</button>
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
              <button onclick="endSession()" style="background-color: #f44336; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 16px; padding: 10px 20px;">End Session</button>
            </div>
          </div>
        </div>
        
        <!-- Session Summary Screen -->
        <div id="sessionSummaryScreen" style="display: none;">
          <div class="card">
            <h2>Session Summary</h2>
            <p>Your translation session has ended.</p>
            
            <div style="background-color: #f5f7fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3>Session Details</h3>
              <p><strong>Provider:</strong> Dr. Sarah Johnson</p>
              <p><strong>Duration:</strong> 15 minutes</p>
              <p><strong>Language:</strong> <span id="summaryLanguageDisplay">Spanish</span></p>
              <p><strong>Messages:</strong> 12</p>
            </div>
            
            <p>A summary of this conversation has been saved to your medical record.</p>
            <button class="btn" onclick="startNewSession()">Start New Session</button>
          </div>
        </div>
      </div>
      
      <script>
        let selectedLanguage = null;
        
        function showLanguageSelection() {
          document.getElementById('welcomeScreen').style.display = 'none';
          document.getElementById('languageSelectionScreen').style.display = 'block';
        }
        
        function selectLanguage(code, name) {
          selectedLanguage = { code, name };
          
          // Update UI
          const options = document.querySelectorAll('.language-option');
          options.forEach(option => {
            option.classList.remove('selected');
          });
          
          event.currentTarget.classList.add('selected');
          document.getElementById('continueBtn').style.display = 'block';
        }
        
        function showSessionCodeEntry() {
          document.getElementById('languageSelectionScreen').style.display = 'none';
          document.getElementById('sessionCodeEntryScreen').style.display = 'block';
        }
        
        function joinSession() {
          const code = document.getElementById('sessionCode').value;
          if (code.length !== 6) {
            alert('Please enter a valid 6-digit code');
            return;
          }
          
          document.getElementById('sessionCodeEntryScreen').style.display = 'none';
          document.getElementById('translationSessionScreen').style.display = 'block';
          document.getElementById('selectedLanguageDisplay').textContent = selectedLanguage.name;
        }
        
        function endSession() {
          document.getElementById('translationSessionScreen').style.display = 'none';
          document.getElementById('sessionSummaryScreen').style.display = 'block';
          document.getElementById('summaryLanguageDisplay').textContent = selectedLanguage.name;
        }
        
        function startNewSession() {
          document.getElementById('sessionSummaryScreen').style.display = 'none';
          document.getElementById('sessionCodeEntryScreen').style.display = 'block';
          document.getElementById('sessionCode').value = '';
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Patient App web server running on port ${port}`);
});
