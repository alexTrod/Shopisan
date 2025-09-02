// Simple test file to verify logging system works
import logger, { 
  error, 
  warn, 
  info, 
  debug, 
  trace,
  map,
  store,
  userAction
} from './logger';

// Test basic logging
export const testBasicLogging = () => {
  console.log('🧪 Testing basic logging...');
  
  try {
    error('Test error message', { test: true });
    warn('Test warning message', { test: true });
    info('Test info message', { test: true });
    debug('Test debug message', { test: true });
    trace('Test trace message', { test: true });
    
    console.log('✅ Basic logging test passed');
    return true;
  } catch (error) {
    console.error('❌ Basic logging test failed:', error);
    return false;
  }
};

// Test specialized logging
export const testSpecializedLogging = () => {
  console.log('🧪 Testing specialized logging...');
  
  try {
    map('Test map operation', { coordinates: { lat: 0, lng: 0 } });
    store('Test store operation', { count: 5 });
    userAction('Test user action', { userId: 'test' });
    
    console.log('✅ Specialized logging test passed');
    return true;
  } catch (error) {
    console.error('❌ Specialized logging test failed:', error);
    return false;
  }
};

// Test logger instance
export const testLoggerInstance = () => {
  console.log('🧪 Testing logger instance...');
  
  try {
    logger.error('Test error via instance', { test: true });
    logger.warn('Test warning via instance', { test: true });
    logger.info('Test info via instance', { test: true });
    
    console.log('✅ Logger instance test passed');
    return true;
  } catch (error) {
    console.error('❌ Logger instance test failed:', error);
    return false;
  }
};

// Run all tests
export const runAllLoggingTests = () => {
  console.log('🚀 Running all logging tests...');
  
  const results = {
    basic: testBasicLogging(),
    specialized: testSpecializedLogging(),
    instance: testLoggerInstance()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('🎉 All logging tests passed!');
  } else {
    console.log('⚠️  Some logging tests failed:', results);
  }
  
  return results;
};

// Export default test runner
export default runAllLoggingTests;
