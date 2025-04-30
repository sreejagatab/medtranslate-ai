/**
 * Integration Test Screen for MedTranslate AI
 * 
 * This screen allows running integration tests to verify the interaction
 * between frontend components and backend APIs.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { runAllTests } from './integration-tests';

export default function IntegrationTestScreen() {
  const navigation = useNavigation();
  
  // State
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [expandedTests, setExpandedTests] = useState({});
  
  // Run all tests
  const handleRunAllTests = async () => {
    try {
      setIsRunning(true);
      setResults(null);
      setExpandedTests({});
      
      // Run tests
      const testResults = await runAllTests();
      
      // Update results
      setResults(testResults);
    } catch (error) {
      console.error('Error running tests:', error);
      Alert.alert('Error', 'Failed to run tests. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };
  
  // Toggle test expansion
  const toggleTestExpansion = (testName) => {
    setExpandedTests(prev => ({
      ...prev,
      [testName]: !prev[testName]
    }));
  };
  
  // Export test results
  const handleExportResults = () => {
    if (!results) return;
    
    // In a real app, you would export the results to a file or send them to a server
    Alert.alert('Export Results', 'Test results would be exported in a real app.');
  };
  
  // Render test item
  const renderTestItem = (test) => {
    const isExpanded = expandedTests[test.name] || false;
    
    let statusIcon;
    let statusColor;
    
    if (test.skipped) {
      statusIcon = 'remove-circle';
      statusColor = '#757575';
    } else if (test.success) {
      statusIcon = 'checkmark-circle';
      statusColor = '#4CAF50';
    } else {
      statusIcon = 'close-circle';
      statusColor = '#F44336';
    }
    
    return (
      <View key={test.name} style={styles.testItem}>
        <TouchableOpacity
          style={styles.testHeader}
          onPress={() => toggleTestExpansion(test.name)}
        >
          <Ionicons name={statusIcon} size={20} color={statusColor} />
          <Text style={styles.testName}>{test.name}</Text>
          <Text style={styles.testDuration}>{test.duration}ms</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#757575"
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.testDetails}>
            <Text style={styles.testStatus}>
              Status: {test.skipped ? 'Skipped' : (test.success ? 'Passed' : 'Failed')}
            </Text>
            
            {test.error && (
              <Text style={styles.testError}>Error: {test.error}</Text>
            )}
          </View>
        )}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Integration Tests</Text>
        
        {results && (
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportResults}
          >
            <Ionicons name="download" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        {/* Test controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.runButton,
              isRunning && styles.runButtonDisabled
            ]}
            onPress={handleRunAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="play" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.runButtonText}>
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>
          
          {results && (
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total:</Text>
                <Text style={styles.summaryValue}>{results.total}</Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Passed:</Text>
                <Text style={[styles.summaryValue, styles.passedValue]}>
                  {results.passed}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Failed:</Text>
                <Text style={[styles.summaryValue, styles.failedValue]}>
                  {results.failed}
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Skipped:</Text>
                <Text style={[styles.summaryValue, styles.skippedValue]}>
                  {results.skipped}
                </Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Test results */}
        {results ? (
          <ScrollView style={styles.results}>
            {results.tests.map(renderTestItem)}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="flask" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {isRunning ? 'Running tests...' : 'Run tests to see results'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0077CC'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  exportButton: {
    padding: 4
  },
  content: {
    flex: 1,
    padding: 16
  },
  controls: {
    marginBottom: 16
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  runButtonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  summaryItem: {
    alignItems: 'center'
  },
  summaryLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333'
  },
  passedValue: {
    color: '#4CAF50'
  },
  failedValue: {
    color: '#F44336'
  },
  skippedValue: {
    color: '#757575'
  },
  results: {
    flex: 1
  },
  testItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  testName: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    marginLeft: 8
  },
  testDuration: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8
  },
  testDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE'
  },
  testStatus: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8
  },
  testError: {
    fontSize: 14,
    color: '#F44336'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16
  }
});
