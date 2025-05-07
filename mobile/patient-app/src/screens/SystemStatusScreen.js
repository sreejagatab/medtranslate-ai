/**
 * SystemStatusScreen for MedTranslate AI Patient App
 *
 * This screen displays the MobileSystemStatusDashboard component,
 * providing a comprehensive view of system status and performance.
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import MobileSystemStatusDashboard from '../components/MobileSystemStatusDashboard';

/**
 * SystemStatusScreen component
 *
 * @returns {JSX.Element} SystemStatusScreen component
 */
const SystemStatusScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MobileSystemStatusDashboard refreshInterval={60000} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
});

export default SystemStatusScreen;
