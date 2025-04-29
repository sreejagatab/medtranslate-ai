/**
 * Unit tests for the WebSocket Server
 */

const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const websocketServer = require('../../backend/websocket/server');

// Create mock objects
const mockWebSocketInstance = {
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
  isAlive: true,
  onmessage: jest.fn()
};

const mockWebSocketServer = {
  on: jest.fn(),
  clients: new Set(),
  close: jest.fn()
};

const mockHttpServer = {
  on: jest.fn(),
  listen: jest.fn()
};

// Mock WebSocket
const MockWebSocket = jest.fn().mockImplementation(() => mockWebSocketInstance);
MockWebSocket.Server = jest.fn().mockImplementation(() => mockWebSocketServer);
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSED = 3;

jest.mock('ws', () => MockWebSocket);

// Mock http
const mockHttp = {
  createServer: jest.fn().mockReturnValue(mockHttpServer)
};
jest.mock('http', () => mockHttp);

// Mock jwt
const mockJwt = {
  verify: jest.fn()
};
jest.mock('jsonwebtoken', () => mockJwt);

describe('WebSocket Server', () => {
  let mockServer;
  let mockWss;
  let mockWs;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset mock objects
    mockWebSocketServer.on.mockClear();
    mockWebSocketServer.clients.clear();
    mockWebSocketServer.close.mockClear();

    mockWebSocketInstance.on.mockClear();
    mockWebSocketInstance.send.mockClear();
    mockWebSocketInstance.close.mockClear();

    mockHttpServer.on.mockClear();
    mockHttpServer.listen.mockClear();

    mockJwt.verify.mockClear();

    // Create mock server
    mockServer = mockHttpServer;

    // Create mock WebSocket server
    mockWss = mockWebSocketServer;

    // Create mock WebSocket client
    mockWs = mockWebSocketInstance;
  });

  describe('initializeWebSocketServer', () => {
    it('should initialize a WebSocket server', () => {
      // Call the function
      websocketServer.initializeWebSocketServer(mockServer);

      // Verify WebSocket.Server was created with the correct parameters
      expect(WebSocket.Server).toHaveBeenCalledWith({
        server: mockServer,
        path: '/ws'
      });

      // Verify connection handler was set up
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('handleConnection', () => {
    it('should handle a new WebSocket connection', () => {
      // Set up mock request with URL
      const mockRequest = {
        url: '/ws/session-123?token=valid-token'
      };

      // Set up JWT verify mock
      jwt.verify.mockReturnValue({
        sub: 'user-123',
        type: 'provider',
        sessionId: 'session-123'
      });

      // Call the function (indirectly through initializeWebSocketServer)
      websocketServer.initializeWebSocketServer(mockServer);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls[0][1];

      // Call the connection handler
      connectionHandler(mockWs, mockRequest);

      // Verify JWT verification was called
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));

      // Verify WebSocket event handlers were set up
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('pong', expect.any(Function));
    });

    it('should reject connection with invalid token', () => {
      // Set up mock request with URL
      const mockRequest = {
        url: '/ws/session-123?token=invalid-token'
      };

      // Set up JWT verify mock to throw
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Call the function (indirectly through initializeWebSocketServer)
      websocketServer.initializeWebSocketServer(mockServer);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls[0][1];

      // Call the connection handler
      connectionHandler(mockWs, mockRequest);

      // Verify WebSocket was closed
      expect(mockWs.close).toHaveBeenCalled();
    });

    it('should reject connection with missing session ID', () => {
      // Set up mock request with URL (missing session ID)
      const mockRequest = {
        url: '/ws?token=valid-token'
      };

      // Set up JWT verify mock
      jwt.verify.mockReturnValue({
        sub: 'user-123',
        type: 'provider'
      });

      // Call the function (indirectly through initializeWebSocketServer)
      websocketServer.initializeWebSocketServer(mockServer);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls[0][1];

      // Call the connection handler
      connectionHandler(mockWs, mockRequest);

      // Verify WebSocket was closed
      expect(mockWs.close).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should handle and broadcast a message', () => {
      // Set up mock WebSocket server with clients
      mockWss.clients = new Set([mockWs]);

      // Set up mock message
      const mockMessage = JSON.stringify({
        type: 'translation',
        messageId: 'msg-123',
        originalText: 'Hello',
        translatedText: 'Hola',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      });

      // Set up WebSocket client data
      mockWs.sessionId = 'session-123';
      mockWs.userId = 'user-123';
      mockWs.userType = 'provider';

      // Call the function (indirectly through handleConnection)
      websocketServer.initializeWebSocketServer(mockServer);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls[0][1];

      // Call the connection handler to set up the message handler
      connectionHandler(mockWs, { url: '/ws/session-123?token=valid-token' });

      // Get the message handler
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];

      // Call the message handler
      messageHandler(mockMessage);

      // Verify message was broadcast
      expect(mockWs.send).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle invalid JSON message', () => {
      // Set up mock WebSocket client data
      mockWs.sessionId = 'session-123';
      mockWs.userId = 'user-123';
      mockWs.userType = 'provider';

      // Call the function (indirectly through handleConnection)
      websocketServer.initializeWebSocketServer(mockServer);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls[0][1];

      // Call the connection handler to set up the message handler
      connectionHandler(mockWs, { url: '/ws/session-123?token=valid-token' });

      // Get the message handler
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];

      // Call the message handler with invalid JSON
      messageHandler('invalid-json');

      // Verify error message was sent
      expect(mockWs.send).toHaveBeenCalledWith(expect.stringContaining('error'));
    });
  });

  describe('broadcastToSession', () => {
    it('should broadcast a message to all clients in a session', () => {
      // Set up mock WebSocket server with clients
      const mockWs1 = new WebSocket();
      const mockWs2 = new WebSocket();
      const mockWs3 = new WebSocket();

      mockWs1.sessionId = 'session-123';
      mockWs2.sessionId = 'session-123';
      mockWs3.sessionId = 'session-456';

      mockWss.clients = new Set([mockWs1, mockWs2, mockWs3]);

      // Set up the WebSocket server
      websocketServer.initializeWebSocketServer(mockServer);

      // Call the function
      websocketServer.broadcastToSession('session-123', {
        type: 'notification',
        message: 'Test message'
      });

      // Verify message was sent to clients in the session
      expect(mockWs1.send).toHaveBeenCalledWith(expect.any(String));
      expect(mockWs2.send).toHaveBeenCalledWith(expect.any(String));
      expect(mockWs3.send).not.toHaveBeenCalled();
    });
  });

  describe('getSessionParticipants', () => {
    it('should return a list of participants in a session', () => {
      // Set up mock WebSocket server with clients
      const mockWs1 = new WebSocket();
      const mockWs2 = new WebSocket();

      mockWs1.sessionId = 'session-123';
      mockWs1.userId = 'provider-123';
      mockWs1.userType = 'provider';
      mockWs1.userName = 'Dr. Smith';

      mockWs2.sessionId = 'session-123';
      mockWs2.userId = 'patient-456';
      mockWs2.userType = 'patient';
      mockWs2.language = 'es';

      mockWss.clients = new Set([mockWs1, mockWs2]);

      // Set up the WebSocket server
      websocketServer.initializeWebSocketServer(mockServer);

      // Call the function
      const participants = websocketServer.getSessionParticipants('session-123');

      // Verify result
      expect(participants).toEqual([
        {
          userId: 'provider-123',
          type: 'provider',
          name: 'Dr. Smith'
        },
        {
          userId: 'patient-456',
          type: 'patient',
          language: 'es'
        }
      ]);
    });
  });

  describe('closeSession', () => {
    it('should close all connections for a session', () => {
      // Set up mock WebSocket server with clients
      const mockWs1 = new WebSocket();
      const mockWs2 = new WebSocket();
      const mockWs3 = new WebSocket();

      mockWs1.sessionId = 'session-123';
      mockWs2.sessionId = 'session-123';
      mockWs3.sessionId = 'session-456';

      mockWss.clients = new Set([mockWs1, mockWs2, mockWs3]);

      // Set up the WebSocket server
      websocketServer.initializeWebSocketServer(mockServer);

      // Call the function
      websocketServer.closeSession('session-123');

      // Verify connections were closed
      expect(mockWs1.close).toHaveBeenCalled();
      expect(mockWs2.close).toHaveBeenCalled();
      expect(mockWs3.close).not.toHaveBeenCalled();
    });
  });
});
