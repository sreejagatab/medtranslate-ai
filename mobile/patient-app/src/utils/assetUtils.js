/**
 * Asset Utilities for MedTranslate AI Patient App
 * 
 * Provides utility functions for handling assets, including fallbacks for missing assets.
 */

import { Image } from 'react-native';
import { Asset } from 'expo-asset';

/**
 * Try to load an image asset with a fallback
 * 
 * @param {string} imagePath - Path to the image asset
 * @param {Object} fallbackOptions - Options for the fallback
 * @param {string} fallbackOptions.type - Type of fallback ('color', 'text', 'default')
 * @param {string} fallbackOptions.color - Background color for fallback
 * @param {string} fallbackOptions.text - Text to display in fallback
 * @returns {Promise<Object>} - Result object with success status and asset info
 */
export const loadImageAsset = async (imagePath, fallbackOptions = {}) => {
  try {
    // Try to load the asset
    const asset = Asset.fromModule(imagePath);
    await asset.downloadAsync();
    
    return {
      success: true,
      asset,
      fallback: false
    };
  } catch (error) {
    console.warn(`Failed to load image asset: ${imagePath}`, error);
    
    return {
      success: false,
      fallback: true,
      fallbackType: fallbackOptions.type || 'default',
      fallbackColor: fallbackOptions.color || '#E0E0E0',
      fallbackText: fallbackOptions.text || 'Image'
    };
  }
};

/**
 * Check if an asset exists
 * 
 * @param {string} imagePath - Path to the image asset
 * @returns {boolean} - Whether the asset exists
 */
export const assetExists = async (imagePath) => {
  try {
    const asset = Asset.fromModule(imagePath);
    await asset.downloadAsync();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get a placeholder component for a missing asset
 * 
 * @param {Object} options - Options for the placeholder
 * @param {string} options.type - Type of placeholder ('logo', 'welcome', 'default')
 * @param {number} options.width - Width of the placeholder
 * @param {number} options.height - Height of the placeholder
 * @param {string} options.text - Text to display in the placeholder
 * @returns {Object} - Style object for the placeholder
 */
export const getPlaceholderStyle = (options = {}) => {
  const { type = 'default', width = 100, height = 100, text = 'Image' } = options;
  
  // Base style
  const baseStyle = {
    width,
    height,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center'
  };
  
  // Type-specific styles
  switch (type) {
    case 'logo':
      return {
        ...baseStyle,
        backgroundColor: '#0066CC',
        borderRadius: width / 2,
        text: 'MT',
        textStyle: {
          color: '#FFFFFF',
          fontSize: width * 0.2,
          fontWeight: 'bold'
        }
      };
      
    case 'welcome':
      const welcomeIndex = parseInt(text.split(' ')[1] || '1', 10);
      const colors = ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6'];
      
      return {
        ...baseStyle,
        backgroundColor: colors[(welcomeIndex - 1) % colors.length],
        borderRadius: 12,
        text: `Welcome ${welcomeIndex}`,
        textStyle: {
          color: '#0066CC',
          fontSize: 16,
          fontWeight: '500'
        }
      };
      
    default:
      return {
        ...baseStyle,
        borderRadius: 8,
        text,
        textStyle: {
          color: '#666666',
          fontSize: 14
        }
      };
  }
};
