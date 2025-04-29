import React from 'react';
import { Navbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ApiStatus from './ApiStatus';

const Navigation = ({ onLogout }) => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">MedTranslate AI Admin</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" active={location.pathname === '/'}>
              Dashboard
            </Nav.Link>

            <NavDropdown
              title="Analytics"
              id="analytics-dropdown"
              active={location.pathname.includes('/analytics')}
            >
              <NavDropdown.Item as={Link} to="/analytics">
                Basic Analytics
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/analytics-dashboard">
                Advanced Dashboard
              </NavDropdown.Item>
            </NavDropdown>

            <Nav.Link as={Link} to="/users" active={location.pathname === '/users'}>
              Users
            </Nav.Link>

            <NavDropdown
              title="System"
              id="system-dropdown"
              active={location.pathname.includes('/system') || location.pathname.includes('/monitoring')}
            >
              <NavDropdown.Item as={Link} to="/system-health">
                System Health
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/monitoring">
                Monitoring Dashboard
              </NavDropdown.Item>
            </NavDropdown>

            <Nav.Link as={Link} to="/settings" active={location.pathname === '/settings'}>
              Settings
            </Nav.Link>
          </Nav>

          <ApiStatus refreshInterval={30000} />

          <Navbar.Text className="mx-3">
            {user ? `Logged in as: ${user.name || user.email}` : ''}
          </Navbar.Text>

          <Button variant="outline-light" onClick={onLogout}>
            Logout
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
