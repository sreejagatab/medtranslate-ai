/**
 * Welcome Screen for MedTranslate AI Patient App
 *
 * First-time user onboarding screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/config';
import FallbackImage from '../components/FallbackImage';
import { SvgXml } from 'react-native-svg';
import { welcomePlaceholders } from '../assets/welcome-placeholder';

// Try to import the actual images, but they might not exist
let welcomeImages = {
  1: null,
  2: null,
  3: null,
  4: null
};

// Try to import the welcome images
try {
  welcomeImages = {
    1: require('../assets/welcome-1.png'),
    2: require('../assets/welcome-2.png'),
    3: require('../assets/welcome-3.png'),
    4: require('../assets/welcome-4.png')
  };
} catch (error) {
  console.warn('Welcome images not found, using placeholders');
}

const WelcomeScreen = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [imagesExist, setImagesExist] = useState({
    1: false,
    2: false,
    3: false,
    4: false
  });

  // Check if images exist
  useEffect(() => {
    const checkImages = async () => {
      try {
        // This will throw an error if the image doesn't exist
        welcomeImages[1] && Image.resolveAssetSource(welcomeImages[1]);
        welcomeImages[2] && Image.resolveAssetSource(welcomeImages[2]);
        welcomeImages[3] && Image.resolveAssetSource(welcomeImages[3]);
        welcomeImages[4] && Image.resolveAssetSource(welcomeImages[4]);

        setImagesExist({
          1: !!welcomeImages[1],
          2: !!welcomeImages[2],
          3: !!welcomeImages[3],
          4: !!welcomeImages[4]
        });
      } catch (error) {
        console.warn('Error checking welcome images:', error);
      }
    };

    checkImages();
  }, []);

  // Onboarding pages content
  const pages = [
    {
      title: 'Welcome to MedTranslate AI',
      description: 'Breaking language barriers in healthcare with real-time medical translation.',
      imageId: 1
    },
    {
      title: 'Join Translation Sessions',
      description: 'Connect with healthcare providers using a simple 6-digit code.',
      imageId: 2
    },
    {
      title: 'Voice & Text Translation',
      description: 'Communicate naturally with voice or text in your preferred language.',
      imageId: 3
    },
    {
      title: 'Works Offline',
      description: 'Continue your session even when internet connection is unstable.',
      imageId: 4
    }
  ];

  // Handle next page
  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      completeOnboarding();
    }
  };

  // Handle skip
  const handleSkip = () => {
    completeOnboarding();
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      navigation.replace('LanguageSelection');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Render welcome image
  const renderWelcomeImage = (imageId) => {
    // If the image exists, use it
    if (imagesExist[imageId] && welcomeImages[imageId]) {
      return (
        <FallbackImage
          source={welcomeImages[imageId]}
          style={styles.image}
          fallbackType="welcome"
          fallbackText={`Welcome ${imageId}`}
        />
      );
    }

    // Otherwise, use SVG placeholder
    const placeholderKey = `welcome${imageId}`;
    const svgContent = welcomePlaceholders[placeholderKey];

    return (
      <View style={styles.image}>
        <SvgXml xml={svgContent} width="100%" height="100%" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageContainer}>
          {renderWelcomeImage(pages[currentPage].imageId)}

          <Text style={styles.title}>{pages[currentPage].title}</Text>
          <Text style={styles.description}>{pages[currentPage].description}</Text>

          <View style={styles.paginationContainer}>
            {pages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentPage && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {currentPage < pages.length - 1 ? (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentPage < pages.length - 1 ? 'Next' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between'
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  image: {
    width: '80%',
    height: 250,
    marginBottom: 40
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'center',
    marginBottom: 16
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24
  },
  paginationContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 5
  },
  paginationDotActive: {
    backgroundColor: '#0066CC'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20
  },
  skipButton: {
    padding: 15
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 16
  },
  nextButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default WelcomeScreen;
