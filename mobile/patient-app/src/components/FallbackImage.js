/**
 * FallbackImage Component for MedTranslate AI Patient App
 * 
 * This component displays an image with a fallback if the image fails to load.
 */

import React, { useState, useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { getPlaceholderStyle } from '../utils/assetUtils';

const FallbackImage = ({
  source,
  style = {},
  fallbackType = 'default',
  fallbackText = 'Image',
  resizeMode = 'contain',
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Get placeholder style based on fallback type
  const placeholderStyle = getPlaceholderStyle({
    type: fallbackType,
    width: style.width || 100,
    height: style.height || 100,
    text: fallbackText
  });
  
  // Handle image load error
  const handleError = () => {
    console.warn(`Failed to load image: ${source}`);
    setImageError(true);
    setImageLoading(false);
  };
  
  // Handle image load success
  const handleLoad = () => {
    setImageLoading(false);
  };
  
  // If image failed to load, show fallback
  if (imageError) {
    return (
      <View style={[styles.fallbackContainer, style, { backgroundColor: placeholderStyle.backgroundColor, borderRadius: placeholderStyle.borderRadius }]}>
        <Text style={placeholderStyle.textStyle}>{placeholderStyle.text}</Text>
      </View>
    );
  }
  
  // Otherwise, show image with fallback as loading state
  return (
    <View style={style}>
      {imageLoading && (
        <View style={[styles.fallbackContainer, { 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          backgroundColor: placeholderStyle.backgroundColor,
          borderRadius: placeholderStyle.borderRadius
        }]}>
          <Text style={placeholderStyle.textStyle}>{placeholderStyle.text}</Text>
        </View>
      )}
      <Image
        source={source}
        style={[styles.image, { opacity: imageLoading ? 0 : 1 }]}
        onError={handleError}
        onLoad={handleLoad}
        resizeMode={resizeMode}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%'
  }
});

export default FallbackImage;
