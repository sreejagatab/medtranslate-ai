/**
 * Stats Card Component for MedTranslate AI Provider Application
 * 
 * This component displays a statistic with an icon and title
 * in a card format for the dashboard.
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatsCard({ title, value, icon, color }) {
  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.iconContainer,
          { backgroundColor: color + '20' } // Add transparency to color
        ]}
      >
        <Ionicons name={`${icon}-outline`} size={24} color={color} />
      </View>
      
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 16,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
});
