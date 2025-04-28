import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    fullName: '',
    userType: 'provider',
    password: ''
  });
  
  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // In a real app, you would fetch data from the API
        // For now, we'll use mock data
        setTimeout(() => {
          setUsers([
            {
              id: '1',
              username: 'dr.smith',
              email: 'dr.smith@hospital.com',
              fullName: 'Dr. John Smith',
              userType: 'provider',
              status: 'active',
              createdAt: '2023-01-15'
            },
            {
              id: '2',
              username: 'dr.johnson',
              email: 'dr.johnson@hospital.com',
              fullName: 'Dr. Sarah Johnson',
              userType: 'provider',
              status: 'active',
              createdAt: '2023-02-20'
            },
            {
              id: '3',
              username: 'nurse.williams',
              email: 'nurse.williams@hospital.com',
              fullName: 'Nurse Robert Williams',
              userType: 'provider',
              status: 'inactive',
              createdAt: '2023-03-10'
            },
            {
              id: '4',
              username: 'admin',
              email: 'admin@medtranslate.ai',
              fullName: 'System Administrator',
              userType: 'admin',
              status: 'active',
              createdAt: '2023-01-01'
            }
          ]);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle add user
  const handleAddUser = async () => {
    try {
      // Validate form
      if (!newUser.username || !newUser.email || !newUser.password) {
        setError('Please fill in all required fields');
        return;
      }
      
      // In a real app, you would make an API call to add the user
      // For now, we'll simulate adding a user
      const mockUser = {
        id: Date.now().toString(),
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        userType: newUser.userType,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setUsers(prev => [...prev, mockUser]);
      setShowAddModal(false);
      setNewUser({
        username: '',
        email: '',
        fullName: '',
        userType: 'provider',
        password: ''
      });
    } catch (error) {
      console.error('Error adding user:', error);
      setError('Failed to add user');
    }
  };
  
  // Handle user status change
  const handleStatusChange = (userId, newStatus) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };
  
  if (isLoading) {
    return <div>Loading users...</div>;
  }
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Users</h1>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          Add User
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{user.fullName}</td>
              <td>{user.email}</td>
              <td>
                <Badge bg={user.userType === 'admin' ? 'danger' : 'primary'}>
                  {user.userType}
                </Badge>
              </td>
              <td>
                <Badge bg={user.status === 'active' ? 'success' : 'secondary'}>
                  {user.status}
                </Badge>
              </td>
              <td>{user.createdAt}</td>
              <td>
                {user.status === 'active' ? (
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => handleStatusChange(user.id, 'inactive')}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => handleStatusChange(user.id, 'active')}
                  >
                    Activate
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {/* Add User Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                name="fullName"
                value={newUser.fullName}
                onChange={handleInputChange}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>User Type</Form.Label>
              <Form.Select
                name="userType"
                value={newUser.userType}
                onChange={handleInputChange}
              >
                <option value="provider">Provider</option>
                <option value="admin">Administrator</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddUser}>
            Add User
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UsersPage;
