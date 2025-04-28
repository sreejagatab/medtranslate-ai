import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ onLogout }) => {
  const location = useLocation();
  
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
            <Nav.Link as={Link} to="/analytics" active={location.pathname === '/analytics'}>
              Analytics
            </Nav.Link>
            <Nav.Link as={Link} to="/users" active={location.pathname === '/users'}>
              Users
            </Nav.Link>
            <Nav.Link as={Link} to="/system-health" active={location.pathname === '/system-health'}>
              System Health
            </Nav.Link>
            <Nav.Link as={Link} to="/settings" active={location.pathname === '/settings'}>
              Settings
            </Nav.Link>
          </Nav>
          <Button variant="outline-light" onClick={onLogout}>
            Logout
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
