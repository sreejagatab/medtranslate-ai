import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Chip,
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
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, WS_URL, LANGUAGES } from '../config';
import OfflineStatusIndicator from '../components/OfflineStatusIndicator';

/**
 * Translation session page
 */
const Session = () => {
  const { sessionId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [openEndDialog, setOpenEndDialog] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [speakerActive, setSpeakerActive] = useState(true);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize session
  useEffect(() => {
    fetchSessionDetails();
    initializeWebSocket();

    return () => {
      // Clean up WebSocket connection
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sessionId, token]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Fetch session details
   */
  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      setError('');

      // This would be a real API call in production
      // For now, we'll use mock data
      const mockSession = {
        id: sessionId,
        patientLanguage: 'es',
        context: 'general',
        startTime: new Date().toISOString(),
        status: 'active',
        sessionCode: '123456'
      };

      setSession(mockSession);
    } catch (err) {
      setError('Failed to load session details. Please try again.');
      console.error('Error fetching session details:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize WebSocket connection
   */
  const initializeWebSocket = () => {
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
          initializeWebSocket();
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

        // Read message aloud if speaker is active and message is from patient
        if (speakerActive && data.message.senderType === 'patient') {
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
        break;

      case 'session_closed':
        console.log('Session closed:', data);

        // Add system message
        addSystemMessage(`Session ended: ${data.reason}`);

        // Redirect to dashboard after a delay
        setTimeout(() => {
          navigate('/dashboard');
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
      targetLanguage: session?.patientLanguage
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
   * End the session
   */
  const endSession = async () => {
    try {
      setEndingSession(true);

      // Call API to end session
      const response = await fetch(`${API_URL}/auth/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to end session');
      }

      // Close WebSocket connection
      if (ws.current) {
        ws.current.close();
      }

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to end session. Please try again.');
      console.error('Error ending session:', err);
    } finally {
      setEndingSession(false);
      setOpenEndDialog(false);
    }
  };

  /**
   * Copy session code to clipboard
   */
  const copySessionCode = () => {
    if (session?.sessionCode) {
      navigator.clipboard.writeText(session.sessionCode);
    }
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
      utterance.lang = 'en-US'; // Provider language is English
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Translation Session
          </Typography>

          {session && (
            <>
              <Chip
                label={`Code: ${session.sessionCode}`}
                color="secondary"
                onClick={copySessionCode}
                onDelete={copySessionCode}
                deleteIcon={<CopyIcon />}
                sx={{ mr: 2 }}
              />

              <Chip
                label={`Patient: ${getLanguageName(session.patientLanguage)}`}
                color="primary"
                sx={{ mr: 2 }}
              />

              <Button
                variant="contained"
                color="error"
                onClick={() => setOpenEndDialog(true)}
              >
                End Session
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Messages */}
          <Grid item xs={12} md={9} sx={{ height: '100%' }}>
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
                    onClick={initializeWebSocket}
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
                          flexDirection: message.senderId === user?.id ? 'row-reverse' : 'row',
                          mb: 1
                        }}
                      >
                        {!message.isSystem && (
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: message.senderId === user?.id ? 'primary.main' : 'secondary.main'
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
                                    textAlign: message.senderId === user?.id ? 'right' : 'left'
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
                                    : message.senderId === user?.id
                                      ? 'flex-end'
                                      : 'flex-start',
                                  bgcolor: message.isSystem
                                    ? 'grey.100'
                                    : message.senderId === user?.id
                                      ? 'primary.light'
                                      : 'secondary.light'
                                }}
                              >
                                <Typography variant={message.isSystem ? 'body2' : 'body1'}>
                                  {message.text}
                                </Typography>

                                {message.translation && (
                                  <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                                    <Typography variant="body2" color="textSecondary">
                                      {message.translation.text}
                                    </Typography>

                                    <Typography variant="caption" color="textSecondary">
                                      Confidence: {message.translation.confidence}
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
                                textAlign: message.senderId === user?.id ? 'right' : 'left',
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
          </Grid>

          {/* Participants */}
          <Grid item xs={12} md={3} sx={{ height: '100%' }}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Participants
              </Typography>

              <List>
                {participants.map((participant) => (
                  <ListItem key={participant.userId}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: participant.userType === 'provider' ? 'primary.main' : 'secondary.main'
                        }}
                      >
                        {participant.userName?.charAt(0) || '?'}
                      </Avatar>
                    </ListItemAvatar>

                    <ListItemText
                      primary={participant.userName}
                      secondary={participant.userType === 'provider' ? 'Provider' : 'Patient'}
                    />
                  </ListItem>
                ))}

                {participants.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No participants yet"
                      secondary="Share the session code with the patient"
                    />
                  </ListItem>
                )}
              </List>

              {session && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Session Information
                  </Typography>

                  <Typography variant="body2">
                    <strong>Session ID:</strong> {session.id}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Patient Language:</strong> {getLanguageName(session.patientLanguage)}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Started:</strong> {new Date(session.startTime).toLocaleString()}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      onClick={copySessionCode}
                      startIcon={<CopyIcon />}
                    >
                      Copy Session Code
                    </Button>
                  </Box>

                  {/* Offline Status */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Connection Status
                    </Typography>
                    <OfflineStatusIndicator />
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* End Session Dialog */}
      <Dialog
        open={openEndDialog}
        onClose={() => setOpenEndDialog(false)}
      >
        <DialogTitle>End Translation Session</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to end this translation session? This action cannot be undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenEndDialog(false)}>
            Cancel
          </Button>

          <Button
            onClick={endSession}
            color="error"
            variant="contained"
            disabled={endingSession}
            startIcon={endingSession && <CircularProgress size={20} color="inherit" />}
          >
            {endingSession ? 'Ending...' : 'End Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Session;
