import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Tab, Nav } from 'react-bootstrap';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    general: {
      siteName: 'MedTranslate AI',
      supportEmail: 'support@medtranslate.ai',
      sessionTimeout: '30'
    },
    translation: {
      defaultSourceLanguage: 'en',
      defaultTargetLanguage: 'es',
      defaultMedicalContext: 'general',
      maxAudioLength: '60'
    },
    security: {
      requireMfa: false,
      passwordExpiration: '90',
      loginAttempts: '5',
      sessionInactivityTimeout: '15'
    },
    notifications: {
      emailNotifications: true,
      errorAlerts: true,
      systemUpdates: true,
      usageReports: 'weekly'
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // In a real app, you would fetch data from the API
        // For now, we'll use mock data
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings');
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Handle form input change
  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };
  
  // Handle save settings
  const handleSaveSettings = async (section) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // In a real app, you would make an API call to save settings
      // For now, we'll simulate saving settings
      setTimeout(() => {
        setIsSaving(false);
        setSuccessMessage(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully`);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <div>Loading settings...</div>;
  }
  
  return (
    <div>
      <h1 className="mb-4">Settings</h1>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          {successMessage}
        </Alert>
      )}
      
      <Tab.Container id="settings-tabs" defaultActiveKey="general">
        <Row>
          <Col md={3}>
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link eventKey="general">General</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="translation">Translation</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="security">Security</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="notifications">Notifications</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          <Col md={9}>
            <Tab.Content>
              <Tab.Pane eventKey="general">
                <Card>
                  <Card.Body>
                    <Card.Title>General Settings</Card.Title>
                    <Form className="mt-4">
                      <Form.Group className="mb-3">
                        <Form.Label>Site Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={settings.general.siteName}
                          onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Support Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={settings.general.supportEmail}
                          onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Session Timeout (minutes)</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.general.sessionTimeout}
                          onChange={(e) => handleInputChange('general', 'sessionTimeout', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        onClick={() => handleSaveSettings('general')}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane eventKey="translation">
                <Card>
                  <Card.Body>
                    <Card.Title>Translation Settings</Card.Title>
                    <Form className="mt-4">
                      <Form.Group className="mb-3">
                        <Form.Label>Default Source Language</Form.Label>
                        <Form.Select
                          value={settings.translation.defaultSourceLanguage}
                          onChange={(e) => handleInputChange('translation', 'defaultSourceLanguage', e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="zh">Chinese</option>
                          <option value="ar">Arabic</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Default Target Language</Form.Label>
                        <Form.Select
                          value={settings.translation.defaultTargetLanguage}
                          onChange={(e) => handleInputChange('translation', 'defaultTargetLanguage', e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="zh">Chinese</option>
                          <option value="ar">Arabic</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Default Medical Context</Form.Label>
                        <Form.Select
                          value={settings.translation.defaultMedicalContext}
                          onChange={(e) => handleInputChange('translation', 'defaultMedicalContext', e.target.value)}
                        >
                          <option value="general">General</option>
                          <option value="cardiology">Cardiology</option>
                          <option value="neurology">Neurology</option>
                          <option value="oncology">Oncology</option>
                          <option value="pediatrics">Pediatrics</option>
                          <option value="psychiatry">Psychiatry</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Maximum Audio Length (seconds)</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.translation.maxAudioLength}
                          onChange={(e) => handleInputChange('translation', 'maxAudioLength', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        onClick={() => handleSaveSettings('translation')}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane eventKey="security">
                <Card>
                  <Card.Body>
                    <Card.Title>Security Settings</Card.Title>
                    <Form className="mt-4">
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="require-mfa"
                          label="Require Multi-Factor Authentication"
                          checked={settings.security.requireMfa}
                          onChange={(e) => handleInputChange('security', 'requireMfa', e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Password Expiration (days)</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.security.passwordExpiration}
                          onChange={(e) => handleInputChange('security', 'passwordExpiration', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Maximum Login Attempts</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.security.loginAttempts}
                          onChange={(e) => handleInputChange('security', 'loginAttempts', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Session Inactivity Timeout (minutes)</Form.Label>
                        <Form.Control
                          type="number"
                          value={settings.security.sessionInactivityTimeout}
                          onChange={(e) => handleInputChange('security', 'sessionInactivityTimeout', e.target.value)}
                        />
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        onClick={() => handleSaveSettings('security')}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab.Pane>
              
              <Tab.Pane eventKey="notifications">
                <Card>
                  <Card.Body>
                    <Card.Title>Notification Settings</Card.Title>
                    <Form className="mt-4">
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="email-notifications"
                          label="Email Notifications"
                          checked={settings.notifications.emailNotifications}
                          onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="error-alerts"
                          label="Error Alerts"
                          checked={settings.notifications.errorAlerts}
                          onChange={(e) => handleInputChange('notifications', 'errorAlerts', e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="system-updates"
                          label="System Update Notifications"
                          checked={settings.notifications.systemUpdates}
                          onChange={(e) => handleInputChange('notifications', 'systemUpdates', e.target.checked)}
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Usage Reports</Form.Label>
                        <Form.Select
                          value={settings.notifications.usageReports}
                          onChange={(e) => handleInputChange('notifications', 'usageReports', e.target.value)}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="never">Never</option>
                        </Form.Select>
                      </Form.Group>
                      
                      <Button 
                        variant="primary" 
                        onClick={() => handleSaveSettings('notifications')}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </div>
  );
};

export default SettingsPage;
