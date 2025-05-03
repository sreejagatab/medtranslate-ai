# Shared Components for MedTranslate AI Mobile App

This directory contains shared components and services that are used across the mobile application. These components are imported from the main `frontend/shared` directory and adapted for use in the mobile app.

## Components

- `EdgeDeviceDiscovery`: Component for discovering and managing edge devices
- Other shared components will be added here as needed

## Services

- `enhanced-edge-discovery`: Service for discovering edge devices on the local network
- Other shared services will be added here as needed

## Usage

To use these shared components, import them directly from this directory:

```javascript
import EdgeDeviceDiscovery from '../shared/components/EdgeDeviceDiscovery';
```

Or for services:

```javascript
import * as EdgeDiscoveryService from '../shared/services/enhanced-edge-discovery';
```
