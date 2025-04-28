# MedTranslate AI API Documentation

This document provides detailed information about the MedTranslate AI API endpoints, request/response formats, and authentication requirements.

## Base URL

- **Development**: `https://api-dev.medtranslate.ai`
- **Testing**: `https://api-test.medtranslate.ai`
- **Production**: `https://api.medtranslate.ai`

## Authentication

Most API endpoints require authentication using JSON Web Tokens (JWT). Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Obtaining a Token

#### Provider Authentication

```
POST /auth/login
```

**Request Body:**
```json
{
  "username": "provider_username",
  "password": "provider_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "provider": {
    "providerId": "provider-123",
    "name": "Dr. Smith",
    "role": "doctor"
  }
}
```

#### Patient Session Authentication

```
POST /sessions/join
```

**Request Body:**
```json
{
  "sessionCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "session-123",
  "language": "es"
}
```

## Session Management

### Create Session

```
POST /sessions
```

**Authentication:** Provider token required

**Request Body:**
```json
{
  "patientName": "John Doe",
  "medicalContext": "cardiology",
  "notes": "Initial consultation",
  "recordSession": true
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-123",
  "sessionCode": "123456"
}
```

### Get Session

```
GET /sessions/{sessionId}
```

**Authentication:** Provider or patient token required

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session-123",
    "providerId": "provider-123",
    "providerName": "Dr. Smith",
    "patientName": "John Doe",
    "medicalContext": "cardiology",
    "status": "active",
    "patientJoined": true,
    "patientLanguage": "es",
    "startTime": "2023-06-01T12:00:00Z",
    "notes": "Initial consultation"
  }
}
```

### Generate Patient Token

```
POST /sessions/patient-token
```

**Authentication:** Provider token required

**Request Body:**
```json
{
  "sessionId": "session-123",
  "language": "es"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionCode": "123456"
}
```

### End Session

```
POST /sessions/{sessionId}/end
```

**Authentication:** Provider token required

**Response:**
```json
{
  "success": true,
  "message": "Session ended successfully"
}
```

## Translation

### Translate Text

```
POST /translate/text
```

**Authentication:** Provider or patient token required

**Request Body:**
```json
{
  "sessionId": "session-123",
  "text": "I have a headache",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "context": "general"
}
```

**Response:**
```json
{
  "success": true,
  "originalText": "I have a headache",
  "translatedText": "Tengo dolor de cabeza",
  "confidence": "high",
  "processingTime": 0.25
}
```

### Translate Audio

```
POST /translate/audio
```

**Authentication:** Provider or patient token required

**Request Body:**
```json
{
  "sessionId": "session-123",
  "audioData": "base64_encoded_audio_data",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "context": "general"
}
```

**Response:**
```json
{
  "success": true,
  "originalText": "I have a headache",
  "translatedText": "Tengo dolor de cabeza",
  "confidence": "high",
  "audioResponse": "base64_encoded_audio_data",
  "processingTime": {
    "transcription": 0.15,
    "translation": 0.1,
    "synthesis": 0.2,
    "total": 0.45
  }
}
```

## Storage

### Store Transcript

```
POST /storage/transcript
```

**Authentication:** Provider token required

**Request Body:**
```json
{
  "sessionId": "session-123",
  "messages": [
    {
      "id": "msg-1",
      "sender": "provider",
      "text": "How are you feeling today?",
      "timestamp": "2023-06-01T12:01:00Z",
      "confidence": "high"
    },
    {
      "id": "msg-2",
      "sender": "patient",
      "text": "I have a headache",
      "timestamp": "2023-06-01T12:02:00Z",
      "confidence": "high"
    }
  ],
  "sessionInfo": {
    "providerId": "provider-123",
    "providerName": "Dr. Smith",
    "medicalContext": "general",
    "patientLanguage": "es",
    "startTime": "2023-06-01T12:00:00Z",
    "endTime": "2023-06-01T12:30:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "objectKey": "sessions/session-123/transcript/1685620800-abcd1234.json",
  "expirationDate": "2023-07-01T12:30:00Z"
}
```

### Get Session Data

```
GET /storage/sessions/{sessionId}
```

**Authentication:** Provider token required

**Response:**
```json
{
  "success": true,
  "sessionData": {
    "sessionId": "session-123",
    "providerName": "Dr. Smith",
    "medicalContext": "general",
    "patientLanguage": "es",
    "startTime": "2023-06-01T12:00:00Z",
    "endTime": "2023-06-01T12:30:00Z",
    "messages": [
      {
        "id": "msg-1",
        "sender": "provider",
        "text": "How are you feeling today?",
        "timestamp": "2023-06-01T12:01:00Z",
        "confidence": "high"
      },
      {
        "id": "msg-2",
        "sender": "patient",
        "text": "I have a headache",
        "timestamp": "2023-06-01T12:02:00Z",
        "confidence": "high"
      }
    ]
  }
}
```

## Edge Device API

The edge device provides a local API for translation when offline.

### Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "models": {
    "en-es": {
      "size": 25600000,
      "modified": "2023-05-15T10:30:00Z"
    },
    "es-en": {
      "size": 25600000,
      "modified": "2023-05-15T10:30:00Z"
    }
  },
  "lastSync": "2023-06-01T08:00:00Z"
}
```

### Translate Audio

```
POST /translate-audio
```

**Request Body:**
```json
{
  "audioData": "base64_encoded_audio_data",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "context": "general"
}
```

**Response:**
```json
{
  "originalText": "I have a headache",
  "translatedText": "Tengo dolor de cabeza",
  "confidence": "high",
  "audioResponse": "base64_encoded_audio_data",
  "processingTime": {
    "transcription": 0.15,
    "translation": 0.1,
    "synthesis": 0.2,
    "total": 0.45
  }
}
```

## WebSocket API

The WebSocket API is used for real-time communication during translation sessions.

### Connect to Session

```
wss://api.medtranslate.ai/sessions/{sessionId}/ws?token={token}
```

### Message Types

#### Patient Joined

```json
{
  "type": "patient_joined",
  "sessionId": "session-123",
  "language": "es",
  "timestamp": "2023-06-01T12:00:00Z"
}
```

#### Patient Left

```json
{
  "type": "patient_left",
  "sessionId": "session-123",
  "timestamp": "2023-06-01T12:30:00Z"
}
```

#### Translation

```json
{
  "type": "translation",
  "messageId": "msg-123",
  "sessionId": "session-123",
  "sender": "patient",
  "originalText": "Tengo dolor de cabeza",
  "translatedText": "I have a headache",
  "confidence": "high",
  "timestamp": "2023-06-01T12:05:00Z"
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes and error messages in case of failure:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

Common error codes:

- `AUTHENTICATION_REQUIRED`: Missing authentication token
- `INVALID_TOKEN`: Invalid or expired token
- `PERMISSION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `VALIDATION_ERROR`: Invalid request parameters
- `SERVER_ERROR`: Internal server error
