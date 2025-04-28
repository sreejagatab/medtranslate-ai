/**
 * Simple web server for the Provider App
 */

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3003;

// Serve static HTML
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MedTranslate AI - Provider App</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f7fa;
          color: #333;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          background-color: #0077CC;
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
          background-color: #0077CC;
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
        }
        .btn:hover {
          background-color: #005fa3;
        }
        .tabs {
          display: flex;
          border-bottom: 1px solid #ddd;
          margin-bottom: 20px;
        }
        .tab {
          padding: 10px 20px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .tab.active {
          border-bottom: 2px solid #0077CC;
          font-weight: bold;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>MedTranslate AI</h1>
        <p>Provider Application</p>
      </header>
      
      <div class="container">
        <div class="card">
          <h2>Login</h2>
          <form id="loginForm">
            <div>
              <label for="username">Username:</label>
              <input type="text" id="username" value="demo" style="padding: 8px; margin: 10px 0; width: 100%; max-width: 300px;">
            </div>
            <div>
              <label for="password">Password:</label>
              <input type="password" id="password" value="demo123" style="padding: 8px; margin: 10px 0; width: 100%; max-width: 300px;">
            </div>
            <button type="button" class="btn" onclick="simulateLogin()">Login</button>
          </form>
        </div>
        
        <div id="dashboard" style="display: none;">
          <div class="tabs">
            <div class="tab active" onclick="switchTab('dashboard-tab')">Dashboard</div>
            <div class="tab" onclick="switchTab('sessions-tab')">Sessions</div>
            <div class="tab" onclick="switchTab('patients-tab')">Patients</div>
            <div class="tab" onclick="switchTab('settings-tab')">Settings</div>
          </div>
          
          <div id="dashboard-tab" class="tab-content active">
            <div class="card">
              <h2>Dashboard</h2>
              <p>Welcome to MedTranslate AI Provider Dashboard</p>
              <div>
                <h3>Recent Sessions</h3>
                <ul>
                  <li>Session #12345 - Spanish - 10 minutes ago</li>
                  <li>Session #12344 - Mandarin - 2 hours ago</li>
                  <li>Session #12343 - Arabic - Yesterday</li>
                </ul>
              </div>
              <button class="btn" onclick="showNewSessionModal()">New Session</button>
            </div>
          </div>
          
          <div id="sessions-tab" class="tab-content">
            <div class="card">
              <h2>Sessions</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Session ID</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Patient</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Language</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Date</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">#12345</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">John Doe</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Spanish</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Today, 10:30 AM</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="#" class="btn" style="padding: 5px 10px; font-size: 14px;">View</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">#12344</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Jane Smith</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Mandarin</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Today, 8:15 AM</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="#" class="btn" style="padding: 5px 10px; font-size: 14px;">View</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">#12343</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Robert Johnson</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Arabic</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Yesterday, 3:45 PM</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="#" class="btn" style="padding: 5px 10px; font-size: 14px;">View</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div id="patients-tab" class="tab-content">
            <div class="card">
              <h2>Patients</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">ID</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Name</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Preferred Language</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Last Visit</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">P-001</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">John Doe</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Spanish</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Today</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="#" class="btn" style="padding: 5px 10px; font-size: 14px;">View</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">P-002</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Jane Smith</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Mandarin</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Today</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="#" class="btn" style="padding: 5px 10px; font-size: 14px;">View</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">P-003</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Robert Johnson</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Arabic</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Yesterday</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="#" class="btn" style="padding: 5px 10px; font-size: 14px;">View</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div id="settings-tab" class="tab-content">
            <div class="card">
              <h2>Settings</h2>
              <form>
                <h3>Account Settings</h3>
                <div>
                  <label for="name">Name:</label>
                  <input type="text" id="name" value="Dr. Sarah Johnson" style="padding: 8px; margin: 10px 0; width: 100%; max-width: 300px;">
                </div>
                <div>
                  <label for="email">Email:</label>
                  <input type="email" id="email" value="sarah.johnson@example.com" style="padding: 8px; margin: 10px 0; width: 100%; max-width: 300px;">
                </div>
                
                <h3>Notification Preferences</h3>
                <div>
                  <input type="checkbox" id="email-notifications" checked>
                  <label for="email-notifications">Email Notifications</label>
                </div>
                <div>
                  <input type="checkbox" id="sms-notifications" checked>
                  <label for="sms-notifications">SMS Notifications</label>
                </div>
                
                <button type="button" class="btn">Save Settings</button>
              </form>
            </div>
          </div>
        </div>
        
        <div id="newSessionModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
          <div style="background-color: white; width: 80%; max-width: 500px; margin: 100px auto; padding: 20px; border-radius: 8px;">
            <h2>New Translation Session</h2>
            <form>
              <div>
                <label for="patientId">Patient:</label>
                <select id="patientId" style="padding: 8px; margin: 10px 0; width: 100%;">
                  <option value="P-001">John Doe (Spanish)</option>
                  <option value="P-002">Jane Smith (Mandarin)</option>
                  <option value="P-003">Robert Johnson (Arabic)</option>
                </select>
              </div>
              <div>
                <label for="sessionNotes">Notes:</label>
                <textarea id="sessionNotes" rows="4" style="padding: 8px; margin: 10px 0; width: 100%;"></textarea>
              </div>
              <div>
                <button type="button" class="btn" onclick="startSession()">Start Session</button>
                <button type="button" style="background-color: #ccc; border: none; border-radius: 4px; color: #333; cursor: pointer; font-size: 16px; padding: 10px 20px; text-align: center; margin-left: 10px;" onclick="hideNewSessionModal()">Cancel</button>
              </div>
            </form>
          </div>
        </div>
        
        <div id="sessionView" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Translation Session #12345</h2>
            <button class="btn" onclick="backToDashboard()">Back to Dashboard</button>
          </div>
          
          <div class="card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <strong>Patient:</strong> John Doe<br>
                <strong>Language:</strong> Spanish<br>
                <strong>Start Time:</strong> 10:30 AM
              </div>
              <div>
                <strong>Session Code:</strong> <span style="font-size: 24px; font-weight: bold;">123456</span>
              </div>
            </div>
            
            <div style="background-color: #f5f7fa; border-radius: 8px; padding: 20px; height: 300px; overflow-y: auto; margin-bottom: 20px;">
              <div style="margin-bottom: 15px; text-align: right;">
                <div style="background-color: #0077CC; color: white; border-radius: 18px 18px 0 18px; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  Hello, how are you feeling today?
                </div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <div style="background-color: #e5e5ea; border-radius: 18px 18px 18px 0; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  <div><em>Original (Spanish):</em> Me duele la cabeza y tengo fiebre.</div>
                  <div><strong>Translation:</strong> I have a headache and fever.</div>
                </div>
              </div>
              
              <div style="margin-bottom: 15px; text-align: right;">
                <div style="background-color: #0077CC; color: white; border-radius: 18px 18px 0 18px; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  How long have you had these symptoms?
                </div>
              </div>
              
              <div style="margin-bottom: 15px;">
                <div style="background-color: #e5e5ea; border-radius: 18px 18px 18px 0; padding: 10px 15px; display: inline-block; max-width: 80%;">
                  <div><em>Original (Spanish):</em> Desde ayer por la tarde. También tengo dolor de garganta.</div>
                  <div><strong>Translation:</strong> Since yesterday afternoon. I also have a sore throat.</div>
                </div>
              </div>
            </div>
            
            <div style="display: flex;">
              <input type="text" placeholder="Type your message..." style="flex-grow: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;">
              <button class="btn">Send</button>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        function simulateLogin() {
          document.getElementById('loginForm').parentElement.style.display = 'none';
          document.getElementById('dashboard').style.display = 'block';
        }
        
        function switchTab(tabId) {
          // Hide all tab contents
          const tabContents = document.querySelectorAll('.tab-content');
          tabContents.forEach(content => {
            content.classList.remove('active');
          });
          
          // Deactivate all tabs
          const tabs = document.querySelectorAll('.tab');
          tabs.forEach(tab => {
            tab.classList.remove('active');
          });
          
          // Activate selected tab
          document.getElementById(tabId).classList.add('active');
          
          // Find and activate the tab button
          const tabIndex = Array.from(tabContents).findIndex(content => content.id === tabId);
          tabs[tabIndex].classList.add('active');
        }
        
        function showNewSessionModal() {
          document.getElementById('newSessionModal').style.display = 'block';
        }
        
        function hideNewSessionModal() {
          document.getElementById('newSessionModal').style.display = 'none';
        }
        
        function startSession() {
          hideNewSessionModal();
          document.getElementById('dashboard').style.display = 'none';
          document.getElementById('sessionView').style.display = 'block';
        }
        
        function backToDashboard() {
          document.getElementById('sessionView').style.display = 'none';
          document.getElementById('dashboard').style.display = 'block';
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Provider App web server running on port ${port}`);
});
