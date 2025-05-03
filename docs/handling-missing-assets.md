# Handling Missing Assets in MedTranslate AI

This document outlines the approach for handling missing assets in the MedTranslate AI applications, particularly in the patient mobile app.

## Overview

The MedTranslate AI patient mobile app requires several image assets for proper display:

- `logo.png`: App logo
- `welcome-1.png`: Welcome screen image 1
- `welcome-2.png`: Welcome screen image 2
- `welcome-3.png`: Welcome screen image 3
- `welcome-4.png`: Welcome screen image 4

To ensure the app functions correctly even when these assets are missing, we've implemented a robust fallback system.

## Fallback System

The fallback system consists of several components:

1. **FallbackImage Component**: A React component that displays an image with a fallback if the image fails to load.
2. **Asset Utilities**: Utility functions for handling assets, including fallbacks for missing assets.
3. **SVG Placeholders**: SVG-based placeholders for missing images.
4. **Placeholder Generator Script**: A script to generate placeholder PNG images for testing.

## Implementation Details

### FallbackImage Component

The `FallbackImage` component (`mobile/patient-app/src/components/FallbackImage.js`) provides a seamless way to display images with fallbacks:

```jsx
<FallbackImage
  source={require('../assets/logo.png')}
  style={styles.logo}
  fallbackType="logo"
  fallbackText="MT"
/>
```

If the image fails to load, the component displays a fallback based on the `fallbackType` and `fallbackText` props.

### Asset Utilities

The asset utilities (`mobile/patient-app/src/utils/assetUtils.js`) provide functions for handling assets:

- `loadImageAsset`: Tries to load an image asset with a fallback
- `assetExists`: Checks if an asset exists
- `getPlaceholderStyle`: Gets a placeholder component for a missing asset

### SVG Placeholders

SVG placeholders are defined in:

- `mobile/patient-app/src/assets/logo-placeholder.js`: Placeholder for the app logo
- `mobile/patient-app/src/assets/welcome-placeholder.js`: Placeholders for welcome screen images

### Placeholder Generator Script

The placeholder generator script (`scripts/generate-placeholder-images.js`) can be used to generate placeholder PNG images for testing:

```bash
# Install dependencies
npm install canvas

# Run the script
node scripts/generate-placeholder-images.js
```

This will generate placeholder PNG images in the `mobile/patient-app/src/assets` directory.

## Usage Guidelines

### Adding New Assets

When adding new assets to the app:

1. Add the asset to the appropriate directory
2. Create a fallback for the asset
3. Use the `FallbackImage` component to display the asset

### Testing with Missing Assets

To test how the app behaves with missing assets:

1. Temporarily rename or remove the asset files
2. Run the app and verify that the fallbacks are displayed correctly

### Generating Placeholder Assets

To generate placeholder assets for testing:

1. Run the placeholder generator script
2. Verify that the generated assets are displayed correctly in the app

## Best Practices

1. **Always Use FallbackImage**: Use the `FallbackImage` component for all images that might be missing.
2. **Provide Meaningful Fallbacks**: Ensure fallbacks provide enough context for users to understand what's missing.
3. **Test Both Scenarios**: Test the app both with and without the actual assets.
4. **Document Required Assets**: Keep the list of required assets up to date in the README.md file.

## Conclusion

By implementing this robust fallback system, we ensure that the MedTranslate AI patient mobile app functions correctly even when assets are missing, providing a better user experience and making the app more resilient.
