#!/bin/bash
set -e

# Setup environment
echo "Setting up MedTranslate Edge environment..."

# Create necessary directories if they don't exist
mkdir -p /greengrass/v2 /models /cache /sync /config /logs

# Set default device ID if not provided
if [ -z "$DEVICE_ID" ]; then
  export DEVICE_ID="MedTranslateEdgeDevice-$(hostname | md5sum | head -c 8)"
  echo "No DEVICE_ID provided, using generated ID: $DEVICE_ID"
fi

# Check for certificates
if [ ! -f "/config/certificates/device.pem.crt" ] || [ ! -f "/config/certificates/private.pem.key" ]; then
  echo "Certificates not found. Running in development mode without AWS IoT Greengrass."
  DEV_MODE=true
else
  # Initialize AWS IoT Greengrass
  echo "Initializing AWS IoT Greengrass..."
  java -Droot=/greengrass/v2 -Dlog.store=FILE \
    -jar /GreengrassInstaller/lib/Greengrass.jar \
    --init-config /config/config.yaml \
    --component-default-user ggc_user:ggc_group \
    --setup-system-service true

  # Start Greengrass nucleus
  echo "Starting Greengrass nucleus..."
  /greengrass/v2/alts/current/distro/bin/loader
fi

# Download initial models if needed
if [ -z "$(ls -A /models)" ]; then
  echo "No models found. Downloading initial models..."
  python3 /app/model_sync.py --model-dir /models --manifest /config/model_manifest.json
fi

# Start the edge application
echo "Starting MedTranslate Edge Application..."
cd /app

# Start health monitoring in background
node health_monitor.js &

# Start the main server
node server.js
