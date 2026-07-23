# 📝 Logging Guide for Shopisan

## Overview
This guide explains how to use the centralized logging system in Shopisan, which provides different log levels for development and production environments.

## 🚀 Quick Start

### Basic Usage
```javascript
import { info, warn, error, debug, trace } from '../utils/logger';

// Log different levels
info('User logged in successfully', { userId: 123 });
warn('API response was slow', { duration: 1500 });
error('Failed to fetch data', error);
debug('Component rendered', { props: componentProps });
trace('Function called', { parameters });
```

### Specialized Logging
```javascript
import { 
  map, 
  store, 
  userAction, 
  performance, 
  api, 
  redux, 
  navigation 
} from '../utils/logger';

// Map-specific logging
map('User moved map', { coordinates: { lat: 48.85, lng: 2.35 } });

// Store-specific logging
store('Fetched stores', { count: 25 });

// User action logging
userAction('Tapped favorite button', { storeId: 'store_123' });

// Performance logging
performance('API call', 150, { endpoint: '/api/stores' });

// API logging
api('GET', '/api/stores', 200, 150, { userId: 123 });

// Redux logging (automatic via middleware)
// No manual calls needed

// Navigation logging
navigation('Home', 'StoreDetail', { storeId: 'store_123' });
```

## 🔧 Log Levels

### Development Mode (`__DEV__ = true`)
- **TRACE**: Most verbose, shows everything
- **DEBUG**: Detailed debugging information
- **INFO**: General information
- **WARN**: Warnings and potential issues
- **ERROR**: Errors and failures

### Production Mode (`__DEV__ = false`)
- **ERROR**: Only errors are logged
- **WARN**: Warnings (if configured)
- **INFO**: Minimal information (if configured)

## 🌍 Environment Configuration

### Development
```javascript
// Full logging enabled
LOG_LEVEL: 'debug'
ENABLE_LOGGING: 'true'
```

### Staging
```javascript
// Moderate logging
LOG_LEVEL: 'info'
ENABLE_LOGGING: 'true'
```

### Production
```javascript
// Minimal logging for performance
LOG_LEVEL: 'error'
ENABLE_LOGGING: 'false'
```

## 📱 Component Lifecycle Logging

```javascript
import { componentLifecycle } from '../utils/logger';

const MyComponent = () => {
  useEffect(() => {
    componentLifecycle('MyComponent', 'mounted');
    
    return () => {
      componentLifecycle('MyComponent', 'unmounted');
    };
  }, []);
  
  // ... component logic
};
```

## 🔄 Redux Logging

Redux logging is automatically handled by middleware. You can configure it in `src/utils/logging.config.js`:

```javascript
// Enable/disable Redux logging per environment
redux: {
  development: true,    // Full Redux logging
  staging: false,       // No Redux logging
  production: false     // No Redux logging
}
```

## 📊 Performance Monitoring

```javascript
import { performance } from '../utils/logger';

const expensiveOperation = async () => {
  const startTime = performance.now();
  
  // ... perform operation
  
  const duration = performance.now() - startTime;
  performance('Expensive operation', duration, { 
    operationType: 'dataProcessing',
    dataSize: 1000 
  });
};
```

## 🎯 Best Practices

### 1. Use Appropriate Log Levels
```javascript
// ✅ Good
info('User completed checkout', { orderId: 'order_123' });
warn('API response time exceeded threshold', { duration: 2000 });
error('Database connection failed', error);

// ❌ Avoid
debug('User clicked button'); // Too verbose for production
error('Minor UI glitch'); // Not really an error
```

### 2. Provide Context
```javascript
// ✅ Good
info('Store data updated', {
  storeId: store.id,
  changes: ['name', 'address'],
  timestamp: new Date().toISOString()
});

// ❌ Avoid
info('Store updated'); // No context
```

### 3. Use Specialized Loggers
```javascript
// ✅ Good
map('Map zoom changed', { from: 10, to: 15 });
store('Store filtered', { criteria: 'category', count: 5 });

// ❌ Avoid
info('Map zoom changed'); // Generic logging
```

### 4. Error Logging
```javascript
// ✅ Good
try {
  // ... operation
} catch (error) {
  error('Failed to process payment', {
    error: error.message,
    stack: error.stack,
    userId: user.id,
    amount: payment.amount
  });
}

// ❌ Avoid
console.error(error); // Use the logger instead
```

## 🔍 Debugging

### Check Current Log Level
```javascript
import { getLoggingStatus } from '../utils/initLogging';

const status = getLoggingStatus();
console.log('Current logging status:', status);
```

### Adjust Log Level at Runtime
```javascript
import { adjustLogLevel } from '../utils/initLogging';

// Temporarily increase logging for debugging
adjustLogLevel('debug');

// Reduce logging for performance
adjustLogLevel('error');
```

### View Error Log (Production)
```javascript
import { getErrorLog } from '../utils/logger';

const errorLog = getErrorLog();
console.log('Recent errors:', errorLog);
```

## 🚨 Migration from Old System

### Old Way
```javascript
import logging from '../utils/logging';

logging('User action', { action: 'login' });
logError('API failed', error);
```

### New Way
```javascript
import { info, error } from '../utils/logger';

info('User action', { action: 'login' });
error('API failed', error);
```

## 📋 Log Categories

| Category | Description | Use Case |
|----------|-------------|----------|
| `MAP` | Map-related operations | Zoom, pan, marker interactions |
| `STORE` | Store data operations | Fetch, filter, update stores |
| `USER` | User actions | Login, logout, preferences |
| `API` | API calls | HTTP requests, responses |
| `REDUX` | State management | Actions, state changes |
| `NAVIGATION` | Screen navigation | Route changes, deep links |
| `PERFORMANCE` | Performance metrics | Render times, API latency |
| `COMPONENT` | Component lifecycle | Mount, update, unmount |

## 🔧 Configuration

### Customize Log Levels
Edit `src/utils/logging.config.js`:

```javascript
export const LOG_CONFIG = {
  development: {
    defaultLevel: LOG_LEVELS.DEBUG,
    console: true,
    redux: true,
    // ... other settings
  },
  production: {
    defaultLevel: LOG_LEVELS.ERROR,
    console: false,
    redux: false,
    // ... other settings
  }
};
```

### Add New Categories
```javascript
export const LOG_CATEGORIES = {
  // ... existing categories
  PAYMENT: 'payment',
  ANALYTICS: 'analytics'
};

export const CATEGORY_RULES = {
  // ... existing rules
  [LOG_CATEGORIES.PAYMENT]: {
    development: LOG_LEVELS.INFO,
    staging: LOG_LEVELS.WARN,
    production: LOG_LEVELS.ERROR
  }
};
```

## 📱 Build Configuration

### EAS Build
The logging system automatically detects the build environment from EAS configuration:

```json
{
  "build": {
    "development": {
      "env": {
        "LOG_LEVEL": "debug",
        "ENABLE_LOGGING": "true"
      }
    },
    "production": {
      "env": {
        "LOG_LEVEL": "error",
        "ENABLE_LOGGING": "false"
      }
    }
  }
}
```

## 🎯 Performance Impact

- **Development**: Full logging with minimal performance impact
- **Staging**: Moderate logging with minimal performance impact
- **Production**: Minimal logging with zero performance impact

## 🆘 Troubleshooting

### Logs Not Appearing
1. Check current log level: `getLoggingStatus()`
2. Verify environment: `getCurrentEnvironment()`
3. Ensure logging is enabled for current environment

### Too Many Logs
1. Reduce log level: `adjustLogLevel('warn')`
2. Use selective logging for specific categories
3. Filter logs by category in configuration

### Performance Issues
1. Ensure production logging is minimal
2. Use appropriate log levels
3. Avoid logging in render loops

---

## 📚 Additional Resources

- [Logger Implementation](../src/utils/logger.js)
- [Configuration](../src/utils/logging.config.js)
- [Redux Middleware](../src/utils/reduxLogger.js)
- [Initialization](../src/utils/initLogging.js)

For questions or issues, refer to the logging configuration files or contact the development team.
