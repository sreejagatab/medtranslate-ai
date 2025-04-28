/**
 * Welcome Screen for MedTranslate AI Patient Application
 * 
 * This screen is shown to first-time users and provides an introduction
 * to the application and its features.
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>MedTranslate AI</Text>
        <Text style={styles.subtitle}>Breaking language barriers in healthcare</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.featureSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="language-outline" size={32} color="#0077CC" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Real-time Translation</Text>
              <Text style={styles.featureDescription}>
                Speak in your language and your healthcare provider will hear it in theirs, instantly.
              </Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="medkit-outline" size={32} color="#0077CC" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Medical Accuracy</Text>
              <Text style={styles.featureDescription}>
                Specialized for healthcare terminology to ensure accurate communication about your health.
              </Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark-outline" size={32} color="#0077CC" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Private & Secure</Text>
              <Text style={styles.featureDescription}>
                Your conversations are protected with healthcare-grade security and privacy.
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.instructionSection}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          
          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Select your preferred language
            </Text>
          </View>
          
          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Join a session with your healthcare provider
            </Text>
          </View>
          
          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Speak naturally in your language
            </Text>
          </View>
          
          <View style={styles.instruction}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>4</Text>
            </View>
            <Text style={styles.instructionText}>
              Receive translated responses from your provider
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={() => navigation.navigate('LanguageSelection')}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#0077CC',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E1F5FE',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  featureSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1F5FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  instructionSection: {
    marginBottom: 30,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0077CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  instructionNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  getStartedButton: {
    backgroundColor: '#0077CC',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});
