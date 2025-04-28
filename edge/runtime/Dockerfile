# Dockerfile for MedTranslate AI Edge Runtime
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=18.x
ENV PYTHONUNBUFFERED=1
ENV MODEL_DIR=/models
ENV CACHE_DIR=/cache
ENV SYNC_DIR=/sync
ENV CONFIG_DIR=/config
ENV LOG_DIR=/logs

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    curl \
    wget \
    unzip \
    jq \
    git \
    build-essential \
    openjdk-11-jdk \
    libsndfile1 \
    ffmpeg \
    libportaudio2 \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Install AWS IoT Greengrass
RUN curl -s https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip > greengrass-nucleus-latest.zip \
    && unzip greengrass-nucleus-latest.zip -d GreengrassInstaller \
    && rm greengrass-nucleus-latest.zip

# Create directories for models, cache, and configuration
RUN mkdir -p /models /cache /sync /config /logs /config/certificates \
    && chmod -R 755 /models /cache /sync /config /logs

# Create Greengrass user and group
RUN groupadd -r ggc_group \
    && useradd -r -m -N -g ggc_group -s /bin/false ggc_user \
    && chown -R ggc_user:ggc_group /greengrass

# Copy the edge application code
COPY edge/app /app
WORKDIR /app

# Install Node.js dependencies
RUN npm install

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Install optional ML dependencies if needed
# Uncomment based on device capabilities
# RUN pip3 install --no-cache-dir torch torchaudio transformers openai-whisper

# Copy configuration files
COPY edge/runtime/config.yaml /config/config.yaml

# Set up entrypoint script
COPY edge/runtime/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 3000 8883

# Set working directory
WORKDIR /app

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]
