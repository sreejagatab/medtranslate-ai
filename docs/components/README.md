# MedTranslate AI Component Documentation

This documentation provides detailed information about the components used in the MedTranslate AI application.

## Table of Contents

- [Provider Dashboard Components](#provider-dashboard-components)
  - [SessionManagementPanel](#sessionmanagementpanel)
  - [PatientHistoryPanel](#patienthistorypanel)
  - [TranslationMonitorPanel](#translationmonitorpanel)
- [Patient Application Components](#patient-application-components)
  - [EnhancedVoiceRecordButton](#enhancedvoicerecordbutton)
  - [TranslationStatusIndicator](#translationstatusindicator)
  - [EnhancedLanguageSelector](#enhancedlanguageselector)
- [Shared Components](#shared-components)
  - [FeedbackCollector](#feedbackcollector)
  - [ApiStatus](#apistatus)

## Provider Dashboard Components

### SessionManagementPanel

The `SessionManagementPanel` component provides a comprehensive interface for managing translation sessions.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| sessions | Array | Yes | Array of session objects |
| onJoinSession | Function | Yes | Callback when joining a session |
| onEndSession | Function | Yes | Callback when ending a session |
| onExportSession | Function | Yes | Callback when exporting a session |
| onRefresh | Function | No | Callback when refreshing the list |
| isLoading | Boolean | No | Whether the component is in a loading state |
| filterOptions | Object | No | Options for filtering sessions |
| sortOptions | Object | No | Options for sorting sessions |

#### Example

```jsx
<SessionManagementPanel
  sessions={sessions}
  onJoinSession={handleJoinSession}
  onEndSession={handleEndSession}
  onExportSession={handleExportSession}
  onRefresh={handleRefresh}
  isLoading={isLoading}
/>
```

### PatientHistoryPanel

The `PatientHistoryPanel` component displays patient information, medical context, and session history.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| patient | Object | Yes | Patient object with details |
| sessions | Array | Yes | Array of session objects for the patient |
| onViewSession | Function | Yes | Callback when viewing a session |
| onAddNote | Function | Yes | Callback when adding a note |
| onUpdateMedicalContext | Function | Yes | Callback when updating medical context |
| isLoading | Boolean | No | Whether the component is in a loading state |

#### Example

```jsx
<PatientHistoryPanel
  patient={patient}
  sessions={sessions}
  onViewSession={handleViewSession}
  onAddNote={handleAddNote}
  onUpdateMedicalContext={handleUpdateMedicalContext}
  isLoading={isLoading}
/>
```

### TranslationMonitorPanel

The `TranslationMonitorPanel` component provides real-time monitoring of translations with quality indicators and error reporting.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| isActive | Boolean | Yes | Whether the session is active |
| translations | Array | Yes | Array of translation objects |
| sessionLanguage | String | Yes | Current session language code |
| onReportError | Function | Yes | Callback when reporting an error |
| onRequestAlternative | Function | Yes | Callback when requesting an alternative translation |
| onToggleAutoCorrect | Function | Yes | Callback when toggling auto-correction |

#### Example

```jsx
<TranslationMonitorPanel
  isActive={isActive}
  translations={translations}
  sessionLanguage="es"
  onReportError={handleReportError}
  onRequestAlternative={handleRequestAlternative}
  onToggleAutoCorrect={handleToggleAutoCorrect}
/>
```

## Patient Application Components

### EnhancedVoiceRecordButton

The `EnhancedVoiceRecordButton` component provides an enhanced voice recording experience with visual feedback.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| onPressIn | Function | Yes | Callback when button is pressed |
| onPressOut | Function | Yes | Callback when button is released |
| isRecording | Boolean | Yes | Whether recording is in progress |
| isTranslating | Boolean | Yes | Whether translation is in progress |
| recordingLevel | Number | No | Current recording level (0-1) |
| disabled | Boolean | No | Whether the button is disabled |
| maxRecordingTime | Number | No | Maximum recording time in seconds |
| showTimer | Boolean | No | Whether to show the recording timer |
| showWaveform | Boolean | No | Whether to show the waveform visualization |

#### Example

```jsx
<EnhancedVoiceRecordButton
  onPressIn={handleStartRecording}
  onPressOut={handleStopRecording}
  isRecording={recording}
  isTranslating={translating}
  recordingLevel={recordingLevel}
  disabled={!isConnected}
  maxRecordingTime={60}
  showTimer={true}
  showWaveform={true}
/>
```

### TranslationStatusIndicator

The `TranslationStatusIndicator` component displays the current status of a translation operation with animated visual feedback.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| status | String | Yes | Current status ('idle', 'recording', 'processing', 'translating', 'completed', 'error') |
| confidence | String | No | Confidence level ('high', 'medium', 'low') |
| errorMessage | String | No | Error message to display |
| progress | Number | No | Progress value (0-1) |
| onRetry | Function | No | Callback when retry button is pressed |
| showDetails | Boolean | No | Whether to show additional details |

#### Example

```jsx
<TranslationStatusIndicator
  status={translationStatus}
  confidence={translationConfidence}
  errorMessage={translationError}
  progress={translationProgress}
  onRetry={handleRetry}
  showDetails={true}
/>
```

### EnhancedLanguageSelector

The `EnhancedLanguageSelector` component provides an enhanced language selection experience with search, detection, and preferences.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| languages | Array | Yes | Array of language objects |
| selectedLanguage | Object | No | Currently selected language |
| onSelectLanguage | Function | Yes | Callback when a language is selected |
| onDetectLanguage | Function | No | Callback when language detection is requested |
| isDetecting | Boolean | No | Whether language detection is in progress |

#### Example

```jsx
<EnhancedLanguageSelector
  languages={LANGUAGES}
  selectedLanguage={selectedLanguage}
  onSelectLanguage={handleSelectLanguage}
  onDetectLanguage={handleDetectLanguage}
  isDetecting={isDetecting}
/>
```

## Shared Components

### FeedbackCollector

The `FeedbackCollector` component provides a UI for collecting user feedback during usability testing.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| isVisible | Boolean | Yes | Whether the feedback form is visible |
| onClose | Function | Yes | Callback when the form is closed |
| onSubmit | Function | Yes | Callback when feedback is submitted |
| componentName | String | No | Name of the component being tested |
| screenName | String | No | Name of the screen being tested |

#### Example

```jsx
<FeedbackCollector
  isVisible={feedbackVisible}
  onClose={() => setFeedbackVisible(false)}
  onSubmit={handleFeedbackSubmit}
  componentName="EnhancedVoiceRecordButton"
  screenName="TranslationSession"
/>
```

### ApiStatus

The `ApiStatus` component displays the current status of API connections and services.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| services | Array | Yes | Array of service objects to monitor |
| onRefresh | Function | No | Callback when refresh is requested |
| isLoading | Boolean | No | Whether the component is in a loading state |
| showDetails | Boolean | No | Whether to show additional details |

#### Example

```jsx
<ApiStatus
  services={[
    { name: 'Backend API', url: '/api/health', status: 'online' },
    { name: 'WebSocket', url: '/ws', status: 'online' },
    { name: 'Edge Connection', status: 'offline' }
  ]}
  onRefresh={handleRefresh}
  isLoading={isLoading}
  showDetails={true}
/>
```
