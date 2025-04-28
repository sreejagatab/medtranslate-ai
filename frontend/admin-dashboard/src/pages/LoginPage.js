import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, you would make an API call to authenticate
      // For now, we'll simulate a successful login with a mock token
      setTimeout(() => {
        if (username === 'admin' && password === 'admin123') {
          const mockToken = 'mock-jwt-token-for-admin';
          onLogin(mockToken);
        } else {
          setError('Invalid username or password');
        }
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login. Please try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-logo">
          <h2>MedTranslate AI</h2>
          <p>Admin Dashboard</p>
        </div>
        
        {error && (
          <Alert variant="danger">{error}</Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formUsername">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
          
          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
          
          <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          
          <div className="mt-3 text-center">
            <small className="text-muted">
              For demo purposes, use username: admin, password: admin123
            </small>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default LoginPage;
