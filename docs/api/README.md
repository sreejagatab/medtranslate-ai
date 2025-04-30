# MedTranslate AI API Documentation

This documentation provides detailed information about the API endpoints used in the MedTranslate AI application.

## Table of Contents

- [Authentication](#authentication)
  - [Login](#login)
  - [Refresh Token](#refresh-token)
  - [Logout](#logout)
- [Sessions](#sessions)
  - [Create Session](#create-session)
  - [Get Sessions](#get-sessions)
  - [Get Session by ID](#get-session-by-id)
  - [End Session](#end-session)
  - [Export Session Transcript](#export-session-transcript)
- [Translation](#translation)
  - [Translate Text](#translate-text)
  - [Translate Audio](#translate-audio)
  - [Get Supported Languages](#get-supported-languages)
  - [Detect Language](#detect-language)
  - [Report Translation Error](#report-translation-error)
  - [Get Alternative Translation](#get-alternative-translation)
  - [Get Translation Statistics](#get-translation-statistics)
- [Patients](#patients)
  - [Create Patient](#create-patient)
  - [Get Patients](#get-patients)
  - [Get Patient by ID](#get-patient-by-id)
  - [Add Patient Note](#add-patient-note)
  - [Update Patient Context](#update-patient-context)
  - [Get Patient History](#get-patient-history)
- [WebSocket](#websocket)
  - [Connect](#connect)
  - [Message Types](#message-types)
- [Edge Connection](#edge-connection)
  - [Connect to Edge Device](#connect-to-edge-device)
  - [Translate with Edge Device](#translate-with-edge-device)

## Authentication

### Login

Authenticates a user and returns a JWT token.

**URL**: `/api/auth/login`

**Method**: `POST`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "provider"
  }
}
```

### Refresh Token

Refreshes an expired JWT token.

**URL**: `/api/auth/refresh-token`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <refresh_token>
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

Logs out a user and invalidates their tokens.

**URL**: `/api/auth/logout`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Sessions

### Create Session

Creates a new translation session.

**URL**: `/api/sessions`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "patientName": "John Doe",
  "patientLanguage": "es",
  "medicalContext": "general"
}
```

**Response**:
```json
{
  "success": true,
  "session": {
    "sessionId": "session123",
    "sessionCode": "ABC123",
    "status": "active",
    "startTime": "2023-06-01T12:00:00Z",
    "patientName": "John Doe",
    "patientLanguage": "es",
    "providerName": "Dr. Smith",
    "medicalContext": "general"
  }
}
```

### Get Sessions

Gets all sessions for the authenticated user.

**URL**: `/api/sessions`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `status` (optional): Filter by status (active, pending, completed, cancelled)
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `patientName` (optional): Filter by patient name
- `patientLanguage` (optional): Filter by patient language

**Response**:
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "session123",
      "sessionCode": "ABC123",
      "status": "active",
      "startTime": "2023-06-01T12:00:00Z",
      "patientName": "John Doe",
      "patientLanguage": "es",
      "providerName": "Dr. Smith",
      "medicalContext": "general"
    },
    {
      "sessionId": "session456",
      "sessionCode": "DEF456",
      "status": "completed",
      "startTime": "2023-05-30T10:00:00Z",
      "endTime": "2023-05-30T10:30:00Z",
      "patientName": "Jane Smith",
      "patientLanguage": "fr",
      "providerName": "Dr. Smith",
      "medicalContext": "cardiology"
    }
  ]
}
```

### Get Session by ID

Gets a session by ID.

**URL**: `/api/sessions/:id`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "session": {
    "sessionId": "session123",
    "sessionCode": "ABC123",
    "status": "active",
    "startTime": "2023-06-01T12:00:00Z",
    "patientName": "John Doe",
    "patientLanguage": "es",
    "providerName": "Dr. Smith",
    "medicalContext": "general",
    "messages": [
      {
        "id": "msg123",
        "text": "Hello, how are you feeling today?",
        "translatedText": "Hola, ¿cómo te sientes hoy?",
        "sender": "provider",
        "timestamp": "2023-06-01T12:01:00Z"
      },
      {
        "id": "msg456",
        "text": "Me duele la cabeza",
        "translatedText": "I have a headache",
        "sender": "patient",
        "timestamp": "2023-06-01T12:02:00Z"
      }
    ]
  }
}
```

### End Session

Ends an active session.

**URL**: `/api/sessions/:id/end`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "session": {
    "sessionId": "session123",
    "status": "completed",
    "endTime": "2023-06-01T12:30:00Z"
  }
}
```

### Export Session Transcript

Exports a session transcript as a PDF or text file.

**URL**: `/api/sessions/:id/export`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `format` (optional): Export format (pdf, text, json)

**Response**:
```json
{
  "success": true,
  "downloadUrl": "https://example.com/api/downloads/transcript_session123.pdf"
}
```

## Translation

### Translate Text

Translates text from one language to another.

**URL**: `/api/translate/text`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "text": "Hello, how are you feeling today?",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "context": "general",
  "sessionId": "session123"
}
```

**Response**:
```json
{
  "success": true,
  "translationId": "translation123",
  "originalText": "Hello, how are you feeling today?",
  "translatedText": "Hola, ¿cómo te sientes hoy?",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "confidence": "high",
  "latency": 150,
  "corrected": false,
  "model": "standard"
}
```

### Translate Audio

Transcribes and translates audio from one language to another.

**URL**: `/api/translate/audio`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "audioData": "base64_encoded_audio_data",
  "sourceLanguage": "es",
  "targetLanguage": "en",
  "context": "general",
  "sessionId": "session123"
}
```

**Response**:
```json
{
  "success": true,
  "translationId": "translation456",
  "originalText": "Me duele la cabeza",
  "translatedText": "I have a headache",
  "sourceLanguage": "es",
  "targetLanguage": "en",
  "confidence": "high",
  "latency": 350,
  "transcriptionLatency": 200,
  "corrected": false,
  "model": "medical",
  "audioResponse": "base64_encoded_audio_data"
}
```

### Get Supported Languages

Gets a list of supported languages.

**URL**: `/api/translate/languages`

**Method**: `GET`

**Response**:
```json
{
  "success": true,
  "languages": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English"
    },
    {
      "code": "es",
      "name": "Spanish",
      "nativeName": "Español"
    },
    {
      "code": "fr",
      "name": "French",
      "nativeName": "Français"
    }
  ]
}
```

### Detect Language

Detects the language of text or audio.

**URL**: `/api/translate/detect`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "text": "Hola, ¿cómo estás?"
}
```

OR

```json
{
  "audioData": "base64_encoded_audio_data"
}
```

**Response**:
```json
{
  "success": true,
  "language": {
    "code": "es",
    "name": "Spanish",
    "nativeName": "Español"
  },
  "confidence": "high"
}
```

### Report Translation Error

Reports an error in a translation.

**URL**: `/api/translate/:id/report`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "reason": "incorrect_translation",
  "details": "The translation is not accurate"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Translation error reported successfully"
}
```

### Get Alternative Translation

Gets an alternative translation for a given translation ID.

**URL**: `/api/translate/:id/alternative`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "translation": {
    "id": "translation789",
    "originalText": "Me duele la cabeza",
    "translatedText": "I have a headache",
    "sourceLanguage": "es",
    "targetLanguage": "en",
    "confidence": "high",
    "latency": 320,
    "model": "enhanced",
    "isAlternative": true
  }
}
```

### Get Translation Statistics

Gets translation statistics for a session or user.

**URL**: `/api/translate/stats`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `sessionId` (optional): Filter by session ID
- `userId` (optional): Filter by user ID
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response**:
```json
{
  "success": true,
  "stats": {
    "total": 50,
    "byConfidence": {
      "high": 35,
      "medium": 10,
      "low": 5
    },
    "byCorrected": {
      "corrected": 8,
      "notCorrected": 42
    },
    "byLanguage": {
      "en-es": 30,
      "es-en": 20
    },
    "byContext": {
      "general": 25,
      "cardiology": 15,
      "neurology": 10
    },
    "averageLatency": 180
  }
}
```

## Patients

### Create Patient

Creates a new patient.

**URL**: `/api/patients`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "name": "John Doe",
  "age": 45,
  "gender": "Male",
  "language": "es",
  "medicalContext": "general"
}
```

**Response**:
```json
{
  "success": true,
  "patient": {
    "patientId": "patient123",
    "name": "John Doe",
    "age": 45,
    "gender": "Male",
    "language": "es",
    "medicalContext": "general",
    "notes": []
  }
}
```

### Get Patients

Gets all patients for the authenticated user.

**URL**: `/api/patients`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `name` (optional): Filter by name
- `language` (optional): Filter by language
- `medicalContext` (optional): Filter by medical context

**Response**:
```json
{
  "success": true,
  "patients": [
    {
      "patientId": "patient123",
      "name": "John Doe",
      "age": 45,
      "gender": "Male",
      "language": "es",
      "medicalContext": "general",
      "lastVisit": "2023-06-01T12:00:00Z"
    },
    {
      "patientId": "patient456",
      "name": "Jane Smith",
      "age": 32,
      "gender": "Female",
      "language": "fr",
      "medicalContext": "cardiology",
      "lastVisit": "2023-05-30T10:00:00Z"
    }
  ]
}
```

### Get Patient by ID

Gets a patient by ID.

**URL**: `/api/patients/:id`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "patient": {
    "patientId": "patient123",
    "name": "John Doe",
    "age": 45,
    "gender": "Male",
    "language": "es",
    "medicalContext": "general",
    "notes": [
      {
        "id": "note123",
        "text": "Patient reports headache and has a history of migraines.",
        "timestamp": "2023-06-01T12:30:00Z",
        "provider": "Dr. Smith"
      }
    ],
    "lastVisit": "2023-06-01T12:00:00Z"
  }
}
```

### Add Patient Note

Adds a note to a patient.

**URL**: `/api/patients/:id/notes`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "text": "Patient reports headache and has a history of migraines.",
  "provider": "Dr. Smith"
}
```

**Response**:
```json
{
  "success": true,
  "note": {
    "id": "note123",
    "text": "Patient reports headache and has a history of migraines.",
    "timestamp": "2023-06-01T12:30:00Z",
    "provider": "Dr. Smith"
  }
}
```

### Update Patient Context

Updates a patient's medical context.

**URL**: `/api/patients/:id/context`

**Method**: `PUT`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "medicalContext": "neurology"
}
```

**Response**:
```json
{
  "success": true,
  "patient": {
    "patientId": "patient123",
    "medicalContext": "neurology"
  }
}
```

### Get Patient History

Gets a patient's medical history.

**URL**: `/api/patients/:id/history`

**Method**: `GET`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "history": {
    "sessions": [
      {
        "sessionId": "session123",
        "startTime": "2023-06-01T12:00:00Z",
        "endTime": "2023-06-01T12:30:00Z",
        "medicalContext": "general",
        "summary": "Patient reported headache and was prescribed medication."
      },
      {
        "sessionId": "session456",
        "startTime": "2023-05-15T10:00:00Z",
        "endTime": "2023-05-15T10:45:00Z",
        "medicalContext": "general",
        "summary": "Follow-up appointment for previous headache issues."
      }
    ],
    "notes": [
      {
        "id": "note123",
        "text": "Patient reports headache and has a history of migraines.",
        "timestamp": "2023-06-01T12:30:00Z",
        "provider": "Dr. Smith"
      },
      {
        "id": "note456",
        "text": "Patient's headaches have improved with medication.",
        "timestamp": "2023-05-15T10:45:00Z",
        "provider": "Dr. Smith"
      }
    ]
  }
}
```

## WebSocket

### Connect

Connects to the WebSocket server for real-time updates.

**URL**: `wss://api.medtranslate.ai/ws`

**Query Parameters**:
- `token`: JWT token for authentication
- `sessionId`: Session ID to join

### Message Types

#### Join Session

```json
{
  "type": "join",
  "sessionId": "session123"
}
```

#### Leave Session

```json
{
  "type": "leave",
  "sessionId": "session123"
}
```

#### Translation

```json
{
  "type": "translation",
  "messageId": "msg123",
  "originalText": "Hello, how are you feeling today?",
  "translatedText": "Hola, ¿cómo te sientes hoy?",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "confidence": "high",
  "timestamp": "2023-06-01T12:01:00Z"
}
```

#### Status Update

```json
{
  "type": "status",
  "sessionId": "session123",
  "status": "active",
  "timestamp": "2023-06-01T12:00:00Z"
}
```

## Edge Connection

### Connect to Edge Device

Connects to an edge device for offline translation.

**URL**: `/api/edge/connect`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "deviceId": "edge123",
  "deviceName": "Patient's Phone",
  "deviceType": "mobile"
}
```

**Response**:
```json
{
  "success": true,
  "connection": {
    "connectionId": "conn123",
    "deviceId": "edge123",
    "status": "connected",
    "timestamp": "2023-06-01T12:00:00Z"
  }
}
```

### Translate with Edge Device

Translates text or audio using an edge device.

**URL**: `/api/edge/translate`

**Method**: `POST`

**Request Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "connectionId": "conn123",
  "text": "Hello, how are you feeling today?",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "context": "general"
}
```

OR

```json
{
  "connectionId": "conn123",
  "audioData": "base64_encoded_audio_data",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "context": "general"
}
```

**Response**:
```json
{
  "success": true,
  "translationId": "translation123",
  "originalText": "Hello, how are you feeling today?",
  "translatedText": "Hola, ¿cómo te sientes hoy?",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "confidence": "high",
  "latency": 50,
  "corrected": false,
  "model": "edge",
  "isOffline": true
}
```
