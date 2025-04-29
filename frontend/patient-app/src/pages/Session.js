import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  CircularProgress,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Send as SendIcon,
  ExitToApp as ExitIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { API_URL, WS_URL, LANGUAGES } from '../config';

/**
 * Patient session page
 */
const Session = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [speakerActive, setSpeakerActive] = useState(true);
  const [patientLanguage, setPatientLanguage] = useState('');
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Initialize session
  useEffect(() => {
    const token = localStorage.getItem('patientToken');
    const language = localStorage.getItem('language');
    
    if (!token || !sessionId) {
      navigate('/');
      return;
    }
    
    setPatientLanguage(language);
    initializeWebSocket(token);
    
    return () => {
      // Clean up WebSocket connection
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sessionId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  /**
   * Initialize WebSocket connection
   */
  const initializeWebSocket = (token) => {
    // Close existing connection if any
    if (ws.current) {
      ws.current.close();
    }
    
    // Create new WebSocket connection
    ws.current = new WebSocket(`${WS_URL}/${sessionId}?token=${token}`);
    
    // Connection opened
    ws.current.addEventListener('open', (event) => {
      console.log('WebSocket connection established');
      setConnected(true);
      setLoading(false);
      
      // Join session
      ws.current.send(JSON.stringify({
        type: 'join_session',
        sessionId
      }));
    });
    
    // Listen for messages
    ws.current.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    });
    
    // Connection closed
    ws.current.addEventListener('close', (event) => {
      console.log('WebSocket connection closed');
      setConnected(false);
      
      // Try to reconnect after a delay
      setTimeout(() => {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
          initializeWebSocket(token);
        }
      }, 3000);
    });
    
    // Connection error
    ws.current.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
      setError('Connection error. Trying to reconnect...');
    });
  };
  
  /**
   * Handle WebSocket messages
   */
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connected':
        console.log('Connected to session:', data);
        break;
      
      case 'session_joined':
        console.log('Joined session:', data);
        setParticipants(data.participants);
        break;
      
      case 'participant_joined':
        console.log('Participant joined:', data);
        setParticipants(prev => [...prev, data.participant]);
        
        // Add system message
        addSystemMessage(`${data.participant.userName} joined the session`);
        break;
      
      case 'participant_left':
        console.log('Participant left:', data);
        setParticipants(prev => 
          prev.filter(p => p.userId !== data.participant.userId)
        );
        
        // Add system message
        addSystemMessage(`${data.participant.userName} left the session`);
        break;
      
      case 'message':
        console.log('Received message:', data);
        setMessages(prev => [...prev, data.message]);
        
        // Read message aloud if speaker is active and message is from provider
        if (speakerActive && data.message.senderType === 'provider') {
          speakText(data.message.text);
        }
        break;
      
      case 'translation':
        console.log('Received translation:', data);
        
        // Update message with translation
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, translation: data.translation } 
              : msg
          )
        );
        
        // Read translation aloud if speaker is active and original message is from provider
        const originalMessage = messages.find(msg => msg.id === data.messageId);
        if (speakerActive && originalMessage?.senderType === 'provider') {
          speakText(data.translation.text);
        }
        break;
      
      case 'session_closed':
        console.log('Session closed:', data);
        
        // Add system message
        addSystemMessage(`Session ended: ${data.reason}`);
        
        // Redirect to home after a delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
        break;
      
      case 'error':
        console.error('WebSocket error:', data);
        setError(data.error || 'An error occurred');
        break;
      
      default:
        console.log('Unknown message type:', data);
        break;
    }
  };
  
  /**
   * Add a system message
   */
  const addSystemMessage = (text) => {
    const systemMessage = {
      id: `system-${Date.now()}`,
      text,
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };
  
  /**
   * Send a message
   */
  const sendMessage = () => {
    if (!inputText.trim() || !connected) {
      return;
    }
    
    // Create message object
    const message = {
      type: 'message',
      sessionId,
      text: inputText,
      targetLanguage: 'en' // Provider language is English
    };
    
    // Send message
    ws.current.send(JSON.stringify(message));
    
    // Clear input
    setInputText('');
  };
  
  /**
   * Handle input key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  /**
   * Leave the session
   */
  const leaveSession = () => {
    // Close WebSocket connection
    if (ws.current) {
      ws.current.close();
    }
    
    // Clear session data
    localStorage.removeItem('patientToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('language');
    
    // Redirect to home
    navigate('/');
  };
  
  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  /**
   * Toggle microphone
   */
  const toggleMicrophone = () => {
    setMicActive(!micActive);
    
    if (!micActive) {
      // Start speech recognition
      startSpeechRecognition();
    } else {
      // Stop speech recognition
      stopSpeechRecognition();
    }
  };
  
  /**
   * Start speech recognition
   */
  const startSpeechRecognition = () => {
    // This would be implemented with the Web Speech API
    console.log('Starting speech recognition');
    
    // Mock implementation
    setTimeout(() => {
      setInputText(prev => prev + ' This is a simulated speech recognition result.');
    }, 3000);
  };
  
  /**
   * Stop speech recognition
   */
  const stopSpeechRecognition = () => {
    // This would be implemented with the Web Speech API
    console.log('Stopping speech recognition');
  };
  
  /**
   * Toggle speaker
   */
  const toggleSpeaker = () => {
    setSpeakerActive(!speakerActive);
  };
  
  /**
   * Speak text using text-to-speech
   */
  const speakText = (text) => {
    // This would be implemented with the Web Speech API
    console.log('Speaking text:', text);
    
    // Mock implementation
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = patientLanguage || 'es'; // Use patient language
      window.speechSynthesis.speak(utterance);
    }
  };
  
  /**
   * Format date for display
   */
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  /**
   * Get language name from code
   */
  const getLanguageName = (code) => {
    const language = LANGUAGES.find(lang => lang.code === code);
    return language ? language.name : code;
  };
  
  /**
   * Get user ID from localStorage
   */
  const getUserId = () => {
    const token = localStorage.getItem('patientToken');
    
    if (!token) {
      return null;
    }
    
    try {
      // Decode JWT token (this is a simplified version)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload).sub;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };
  
  const userId = getUserId();
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MedTranslate AI - Patient View
          </Typography>
          
          {patientLanguage && (
            <Typography variant="body1" sx={{ mr: 2 }}>
              Language: {getLanguageName(patientLanguage)}
            </Typography>
          )}
          
          <Button
            variant="contained"
            color="error"
            startIcon={<ExitIcon />}
            onClick={() => setOpenLeaveDialog(true)}
          >
            Leave Session
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Main content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2 }}>
        <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'error.main', flexGrow: 1 }}>
              <Typography>{error}</Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => initializeWebSocket(localStorage.getItem('patientToken'))}
                sx={{ mt: 2 }}
              >
                Reconnect
              </Button>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              <List>
                {messages.map((message) => (
                  <ListItem
                    key={message.id}
                    alignItems="flex-start"
                    sx={{
                      flexDirection: message.senderId === userId ? 'row-reverse' : 'row',
                      mb: 1
                    }}
                  >
                    {!message.isSystem && (
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: message.senderType === 'provider' ? 'primary.main' : 'secondary.main'
                          }}
                        >
                          {message.senderName?.charAt(0) || '?'}
                        </Avatar>
                      </ListItemAvatar>
                    )}
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          {!message.isSystem && (
                            <Typography
                              variant="subtitle2"
                              sx={{
                                textAlign: message.senderId === userId ? 'right' : 'left'
                              }}
                            >
                              {message.senderName}
                            </Typography>
                          )}
                          
                          <Paper
                            elevation={1}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              maxWidth: '80%',
                              alignSelf: message.isSystem
                                ? 'center'
                                : message.senderId === userId
                                  ? 'flex-end'
                                  : 'flex-start',
                              bgcolor: message.isSystem
                                ? 'grey.100'
                                : message.senderId === userId
                                  ? 'secondary.light'
                                  : 'primary.light'
                            }}
                          >
                            <Typography variant={message.isSystem ? 'body2' : 'body1'}>
                              {message.translation && message.senderType === 'provider'
                                ? message.translation.text
                                : message.text}
                            </Typography>
                            
                            {message.translation && message.senderType !== 'provider' && (
                              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                <Typography variant="body2" color="textSecondary">
                                  {message.translation.text}
                                </Typography>
                              </Box>
                            )}
                          </Paper>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            textAlign: message.senderId === userId ? 'right' : 'left',
                            mt: 0.5
                          }}
                        >
                          {formatTime(message.timestamp)}
                        </Typography>
                      }
                      sx={{
                        margin: 0
                      }}
                    />
                  </ListItem>
                ))}
                <div ref={messagesEndRef} />
              </List>
            </Box>
          )}
          
          {/* Input area */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color={micActive ? 'primary' : 'default'}
              onClick={toggleMicrophone}
            >
              {micActive ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            
            <IconButton
              color={speakerActive ? 'primary' : 'default'}
              onClick={toggleSpeaker}
            >
              {speakerActive ? <VolumeUpIcon /> : <VolumeOffIcon />}
            </IconButton>
            
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!connected}
              sx={{ mx: 1 }}
            />
            
            <Button
              variant="contained"
              color="primary"
              endIcon={<SendIcon />}
              onClick={sendMessage}
              disabled={!connected || !inputText.trim()}
            >
              Send
            </Button>
          </Box>
        </Paper>
      </Box>
      
      {/* Leave Session Dialog */}
      <Dialog
        open={openLeaveDialog}
        onClose={() => setOpenLeaveDialog(false)}
      >
        <DialogTitle>Leave Translation Session</DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave this translation session? You will need a new session code to rejoin.
          </DialogContentText>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpenLeaveDialog(false)}>
            Cancel
          </Button>
          
          <Button
            onClick={leaveSession}
            color="error"
            variant="contained"
          >
            Leave Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Session;
