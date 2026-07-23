import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { runCitiesMigration } from '../utils/runMigration';

/**
 * Migration Runner Component
 * Use this component to manually run the cities migration
 */
export default function MigrationRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleMigration = async () => {
    setIsRunning(true);
    setResult(null);
    
    try {
      console.log('🚀 Starting cities migration...');
      const migrationResult = await runCitiesMigration();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        Alert.alert(
          'Migration Successful',
          `Successfully migrated ${migrationResult.migrated || 0} cities to Firestore.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Migration Info',
          migrationResult.message || 'Migration not needed or failed.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Migration error:', error);
      Alert.alert(
        'Migration Error',
        `Failed to run migration: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cities Migration</Text>
      <Text style={styles.description}>
        Run this to migrate cities.json data to Firestore.
        This should only be run once.
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={handleMigration}
        disabled={isRunning}
      >
        <Text style={styles.buttonText}>
          {isRunning ? 'Running Migration...' : 'Run Migration'}
        </Text>
      </TouchableOpacity>
      
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Migration Result:</Text>
          <Text style={styles.resultText}>
            Status: {result.success ? '✅ Success' : '❌ Failed'}
          </Text>
          {result.migrated && (
            <Text style={styles.resultText}>
              Migrated: {result.migrated} cities
            </Text>
          )}
          {result.errors && result.errors > 0 && (
            <Text style={styles.resultText}>
              Errors: {result.errors} cities
            </Text>
          )}
          {result.message && (
            <Text style={styles.resultText}>
              Message: {result.message}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
  },
});
