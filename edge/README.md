# MedTranslate AI Edge Component

This directory contains the edge computing components for the MedTranslate AI system, enabling local translation, caching, and synchronization with the cloud.

## Directory Structure

```
edge/
├── app/                  # Edge application code
│   ├── server.js         # Main server application
│   ├── translation.js    # Translation module
│   ├── model_manager.js  # Model management module
│   ├── sync.js           # Cloud synchronization module
│   ├── cache.js          # Local caching module
│   ├── health_monitor.js # Health monitoring module
│   ├── inference.py      # Python inference script
│   ├── audio_processor.py # Audio processing script
│   ├── model_sync.py     # Model synchronization script
│   ├── requirements.txt  # Python dependencies
│   └── package.json      # Node.js dependencies
├── runtime/              # Edge runtime environment
│   ├── Dockerfile        # Container definition
│   ├── entrypoint.sh     # Container entrypoint script
│   └── config.yaml       # AWS IoT Greengrass configuration
└── README.md             # This file
```

## Features

- **Local Translation**: Perform translations locally on the edge device for low-latency operation
- **Multiple Language Support**: Support for multiple language pairs with fallback to pivot translation
- **Caching**: Cache translations locally to improve performance and enable offline operation
- **Cloud Synchronization**: Sync translations and models with the cloud when connected
- **Conflict Resolution**: Handle conflicts between local and cloud data
- **Health Monitoring**: Monitor the health of the edge application and report issues
- **AWS IoT Greengrass Integration**: Deploy and manage the edge application using AWS IoT Greengrass

## Getting Started

### Prerequisites

- Docker
- AWS Account with IoT Greengrass configured
- AWS CLI configured with appropriate permissions

### Building the Edge Container

```bash
# Build the container
docker build -t medtranslate-edge -f edge/runtime/Dockerfile .

# Run the container locally
docker run -p 3000:3000 -v /path/to/models:/models -v /path/to/config:/config medtranslate-edge
```

### Deploying to an Edge Device

1. Set up AWS IoT Greengrass on the edge device
2. Configure the device with the appropriate certificates
3. Deploy the MedTranslate AI components using the AWS IoT Greengrass console or CLI

```bash
# Deploy using AWS CLI
aws greengrassv2 create-deployment \
  --target-arn "arn:aws:iot:region:account-id:thing/thing-name" \
  --deployment-name "MedTranslateEdgeDeployment" \
  --components '{"com.medtranslate.TranslationService":{"componentVersion":"1.0.0"}}'
```

## API Endpoints

The edge application exposes the following REST API endpoints:

- `GET /health` - Get the health status of the edge application
- `GET /languages` - Get the list of supported language pairs
- `POST /translate` - Translate text
- `POST /translate-audio` - Translate audio
- `GET /sync/status` - Get the synchronization status
- `POST /sync/force` - Force synchronization with the cloud
- `POST /models/update` - Check for and download model updates
- `POST /cache/clear` - Clear the translation cache

## WebSocket API

The edge application also exposes a WebSocket API for real-time translation:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://edge-device:3000');

// Send translation request
ws.send(JSON.stringify({
  type: 'translate',
  requestId: 'unique-request-id',
  text: 'Hello, how are you?',
  sourceLanguage: 'en',
  targetLanguage: 'es',
  context: 'general'
}));

// Receive translation response
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  if (response.type === 'translation' && response.requestId === 'unique-request-id') {
    console.log(response.result.translatedText);
  }
};
```

## Configuration

The edge application can be configured using environment variables:

- `PORT` - Port to listen on (default: 3000)
- `MODEL_DIR` - Directory to store models (default: /models)
- `CACHE_DIR` - Directory to store cache (default: /cache)
- `SYNC_DIR` - Directory to store sync data (default: /sync)
- `CONFIG_DIR` - Directory to store configuration (default: /config)
- `LOG_DIR` - Directory to store logs (default: /logs)
- `CLOUD_API_URL` - URL of the cloud API (default: https://api.medtranslate.ai)
- `SYNC_INTERVAL` - Interval for synchronization in milliseconds (default: 300000)
- `DEVICE_ID` - Unique identifier for the edge device (default: auto-generated)

## Troubleshooting

### Common Issues

- **No models available**: Ensure that the models directory contains valid translation models
- **Connection to cloud failed**: Check network connectivity and cloud API URL
- **Translation failed**: Check that the language pair is supported and the model is properly loaded

### Logs

Logs are stored in the following locations:

- Application logs: `/logs/app.log`
- Health monitor logs: `/logs/health_monitor.log`
- Model sync logs: `/var/log/medtranslate/model_sync.log`

## Development

### Running Locally

```bash
# Install dependencies
cd edge/app
npm install
pip install -r requirements.txt

# Start the server
npm start
```

### Running Tests

```bash
# Run Node.js tests
cd edge/app
npm test

# Run Python tests
cd edge/app
python -m unittest discover tests
```
