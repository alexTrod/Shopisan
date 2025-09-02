// Logging configuration for different environments
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
};

// Environment-specific logging configurations
export const LOG_CONFIG = {
  development: {
    defaultLevel: LOG_LEVELS.DEBUG,
    console: true,
    file: false,
    remote: false,
    performance: true,
    api: true,
    navigation: true,
    redux: true,
    componentLifecycle: true
  },
  staging: {
    defaultLevel: LOG_LEVELS.INFO,
    console: true,
    file: true,
    remote: false,
    performance: true,
    api: true,
    navigation: true,
    redux: false,
    componentLifecycle: false
  },
  production: {
    defaultLevel: LOG_LEVELS.ERROR,
    console: false,
    file: false,
    remote: true,
    performance: false,
    api: false,
    navigation: false,
    redux: false,
    componentLifecycle: false
  }
};

// Get current environment
export const getCurrentEnvironment = () => {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) return 'development';
    
    // You can add logic here to detect staging vs production
    // For example, based on build configuration or environment variables
    return 'production';
  } catch (error) {
    // Fallback to production if environment detection fails
    return 'production';
  }
};

// Get logging configuration for current environment
export const getLogConfig = () => {
  try {
    const env = getCurrentEnvironment();
    return LOG_CONFIG[env] || LOG_CONFIG.production;
  } catch (error) {
    // Fallback to production config if anything fails
    return LOG_CONFIG.production;
  }
};

// Log level priorities for filtering
export const LOG_PRIORITIES = {
  [LOG_LEVELS.ERROR]: 0,
  [LOG_LEVELS.WARN]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.DEBUG]: 3,
  [LOG_LEVELS.TRACE]: 4
};

// Check if a log level should be displayed based on current config
export const shouldLog = (level, config = null) => {
  try {
    const currentConfig = config || getLogConfig();
    const currentLevel = currentConfig.defaultLevel;
    
    return LOG_PRIORITIES[level] <= LOG_PRIORITIES[currentLevel];
  } catch (error) {
    // Fallback to error-only logging if anything fails
    return LOG_PRIORITIES[level] <= LOG_PRIORITIES[LOG_LEVELS.ERROR];
  }
};

// Log categories for better organization
export const LOG_CATEGORIES = {
  MAP: 'map',
  STORE: 'store',
  USER: 'user',
  API: 'api',
  REDUX: 'redux',
  NAVIGATION: 'navigation',
  PERFORMANCE: 'performance',
  COMPONENT: 'component',
  ERROR: 'error',
  GENERAL: 'general'
};

// Category-specific logging rules
export const CATEGORY_RULES = {
  [LOG_CATEGORIES.MAP]: {
    development: LOG_LEVELS.DEBUG,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.STORE]: {
    development: LOG_LEVELS.DEBUG,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.USER]: {
    development: LOG_LEVELS.INFO,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.WARN
  },
  [LOG_CATEGORIES.API]: {
    development: LOG_LEVELS.INFO,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.REDUX]: {
    development: LOG_LEVELS.DEBUG,
    staging: LOG_LEVELS.WARN,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.NAVIGATION]: {
    development: LOG_LEVELS.INFO,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.PERFORMANCE]: {
    development: LOG_LEVELS.INFO,
    staging: LOG_LEVELS.WARN,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.COMPONENT]: {
    development: LOG_LEVELS.DEBUG,
    staging: LOG_LEVELS.WARN,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.ERROR]: {
    development: LOG_LEVELS.ERROR,
    staging: LOG_LEVELS.ERROR,
    production: LOG_LEVELS.ERROR
  },
  [LOG_CATEGORIES.GENERAL]: {
    development: LOG_LEVELS.DEBUG,
    staging: LOG_LEVELS.INFO,
    production: LOG_LEVELS.ERROR
  }
};

// Check if a category should be logged at a specific level
export const shouldLogCategory = (category, level) => {
  try {
    const env = getCurrentEnvironment();
    const categoryConfig = CATEGORY_RULES[category];
    
    if (!categoryConfig) return true;
    
    const maxLevel = categoryConfig[env];
    return LOG_PRIORITIES[level] <= LOG_PRIORITIES[maxLevel];
  } catch (error) {
    // Fallback to error-only logging if anything fails
    return LOG_PRIORITIES[level] <= LOG_PRIORITIES[LOG_LEVELS.ERROR];
  }
};

// Performance logging configuration
export const PERFORMANCE_CONFIG = {
  development: {
    enabled: true,
    threshold: 16, // 16ms = 60fps threshold
    logSlowOperations: true,
    logMemoryUsage: true
  },
  staging: {
    enabled: true,
    threshold: 32, // 32ms = 30fps threshold
    logSlowOperations: true,
    logMemoryUsage: false
  },
  production: {
    enabled: false,
    threshold: 100, // 100ms threshold
    logSlowOperations: false,
    logMemoryUsage: false
  }
};

// Get performance configuration for current environment
export const getPerformanceConfig = () => {
  try {
    const env = getCurrentEnvironment();
    return PERFORMANCE_CONFIG[env] || PERFORMANCE_CONFIG.production;
  } catch (error) {
    // Fallback to production config if anything fails
    return PERFORMANCE_CONFIG.production;
  }
};
