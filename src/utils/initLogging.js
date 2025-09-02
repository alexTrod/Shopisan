// Initialize logging system based on environment and build configuration
import logger, { setLogLevel } from './logger';
import { getLogConfig, getCurrentEnvironment, LOG_LEVELS } from './logging.config';

// Initialize logging system
export const initializeLogging = () => {
  try {
    const env = getCurrentEnvironment();
    const config = getLogConfig();
  
  // Set log level based on environment
  setLogLevel(config.defaultLevel);
  
  // Log initialization
  if (config.console) {
    logger.info('Logging system initialized', {
      environment: env,
      logLevel: config.defaultLevel,
      console: config.console,
      file: config.file,
      remote: config.remote,
      performance: config.performance,
      api: config.api,
      navigation: config.navigation,
      redux: config.redux,
      componentLifecycle: config.componentLifecycle
    });
  }
  
  // Log environment-specific information
  switch (env) {
    case 'development':
      logger.debug('Development mode logging enabled', {
        features: ['debug', 'trace', 'performance', 'redux', 'componentLifecycle']
      });
      break;
      
    case 'staging':
      logger.info('Staging mode logging enabled', {
        features: ['info', 'warn', 'performance', 'api', 'navigation']
      });
      break;
      
    case 'production':
      logger.error('Production mode logging enabled', {
        features: ['error only'],
        note: 'Minimal logging for performance'
      });
      break;
      
    default:
      logger.warn('Unknown environment, using production logging', {
        environment: env,
        fallback: 'production'
      });
      setLogLevel(LOG_LEVELS.ERROR);
  }
  
    return {
      environment: env,
      config,
      logger
    };
  } catch (error) {
    // Fallback to basic logging if initialization fails
    console.warn('Logging initialization failed, using fallback:', error);
    setLogLevel('error');
    
    return {
      environment: 'production',
      config: { defaultLevel: 'error', console: false },
      logger
    };
  }
};

// Runtime log level adjustment
export const adjustLogLevel = (newLevel) => {
  try {
    if (Object.values(LOG_LEVELS).includes(newLevel)) {
      setLogLevel(newLevel);
      logger.info('Log level adjusted', {
        newLevel,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    
    logger.warn('Invalid log level specified', {
      requested: newLevel,
      valid: Object.values(LOG_LEVELS)
    });
    return false;
  } catch (error) {
    console.warn('Log level adjustment failed:', error);
    return false;
  }
};

// Get current logging status
export const getLoggingStatus = () => {
  try {
    const env = getCurrentEnvironment();
    const config = getLogConfig();
    
    return {
      environment: env,
      currentLevel: config.defaultLevel,
      features: {
        console: config.console,
        file: config.file,
        remote: config.remote,
        performance: config.performance,
        api: config.api,
        navigation: config.navigation,
        redux: config.redux,
        componentLifecycle: config.componentLifecycle
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn('Failed to get logging status:', error);
    return {
      environment: 'production',
      currentLevel: 'error',
      features: {
        console: false,
        file: false,
        remote: false,
        performance: false,
        api: false,
        navigation: false,
        redux: false,
        componentLifecycle: false
      },
      timestamp: new Date().toISOString(),
      error: 'Fallback configuration due to error'
    };
  }
};

// Export initialization function
export default initializeLogging;
