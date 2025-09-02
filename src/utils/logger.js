// Centralized logging utility with different levels for dev and build modes
class Logger {
  constructor() {
    this.isDev = __DEV__;
    this.logLevel = this.isDev ? 'debug' : 'error';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };

    // Bind all methods to preserve 'this' context
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
    this.performance = this.performance.bind(this);
    this.api = this.api.bind(this);
    this.map = this.map.bind(this);
    this.store = this.store.bind(this);
    this.userAction = this.userAction.bind(this);
    this.componentLifecycle = this.componentLifecycle.bind(this);
    this.redux = this.redux.bind(this);
    this.navigation = this.navigation.bind(this);
    this.setLogLevel = this.setLogLevel.bind(this);
    this.getErrorLog = this.getErrorLog.bind(this);
    this.clearErrorLog = this.clearErrorLog.bind(this);
  }

  // Set log level (useful for runtime configuration)
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.logLevel = level;
    }
  }

  // Check if a log level should be displayed
  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  // Format log message with timestamp and context
  formatMessage(level, message, context = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context) {
      return `${prefix} ${message} | Context: ${JSON.stringify(context)}`;
    }
    
    return `${prefix} ${message}`;
  }

  // Error logging (always shown)
  error(message, context = null) {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message, context);
      console.error(formattedMessage);
      
      // In production, you might want to send errors to a service
      if (!this.isDev) {
        this.sendToErrorService(message, context);
      }
    }
  }

  // Warning logging
  warn(message, context = null) {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message, context);
      console.warn(formattedMessage);
    }
  }

  // Info logging
  info(message, context = null) {
    if (this.shouldLog('info')) {
      const formattedMessage = this.formatMessage('info', message, context);
      console.info(formattedMessage);
    }
  }

  // Debug logging (only in dev mode)
  debug(message, context = null) {
    if (this.shouldLog('debug')) {
      const formattedMessage = this.formatMessage('debug', message, context);
      console.log(formattedMessage);
    }
  }

  // Trace logging (only in dev mode, most verbose)
  trace(message, context = null) {
    if (this.shouldLog('trace')) {
      const formattedMessage = this.formatMessage('trace', message, context);
      console.log(formattedMessage);
    }
  }

  // Performance logging
  performance(operation, duration, context = null) {
    if (this.shouldLog('info')) {
      const message = `Performance: ${operation} took ${duration}ms`;
      const formattedMessage = this.formatMessage('info', message, context);
      console.log(formattedMessage);
    }
  }

  // API logging
  api(method, url, status, duration, context = null) {
    if (this.shouldLog('info')) {
      const message = `API: ${method} ${url} - ${status} (${duration}ms)`;
      const formattedMessage = this.formatMessage('info', message, context);
      console.log(formattedMessage);
    }
  }

  // Map-specific logging
  map(operation, context = null) {
    if (this.shouldLog('debug')) {
      const message = `🗺️ Map: ${operation}`;
      const formattedMessage = this.formatMessage('debug', message, context);
      console.log(formattedMessage);
    }
  }

  // Store-specific logging
  store(operation, context = null) {
    if (this.shouldLog('debug')) {
      const message = `🏪 Store: ${operation}`;
      const formattedMessage = this.formatMessage('debug', message, context);
      console.log(formattedMessage);
    }
  }

  // User action logging
  userAction(action, context = null) {
    if (this.shouldLog('info')) {
      const message = `👤 User: ${action}`;
      const formattedMessage = this.formatMessage('info', message, context);
      console.log(formattedMessage);
    }
  }

  // Error service integration (for production)
  sendToErrorService(message, context) {
    // In production, you can integrate with services like:
    // - Sentry
    // - Crashlytics
    // - Firebase Crashlytics
    // - Custom error tracking service
    
    // For now, we'll just store in memory (could be extended)
    if (!this.errorLog) {
      this.errorLog = [];
    }
    
    this.errorLog.push({
      timestamp: Date.now(),
      message,
      context,
      stack: new Error().stack
    });
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  // Get error log (useful for debugging production issues)
  getErrorLog() {
    return this.errorLog || [];
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
  }

  // Log component lifecycle
  componentLifecycle(componentName, lifecycle, context = null) {
    if (this.shouldLog('debug')) {
      const message = `🔄 ${componentName}: ${lifecycle}`;
      const formattedMessage = this.formatMessage('debug', message, context);
      console.log(formattedMessage);
    }
  }

  // Log Redux actions
  redux(action, state, context = null) {
    if (this.shouldLog('debug')) {
      const message = `🔄 Redux: ${action}`;
      const formattedMessage = this.formatMessage('debug', message, context);
      console.log(formattedMessage);
    }
  }

  // Log navigation
  navigation(from, to, context = null) {
    if (this.shouldLog('info')) {
      const message = `🧭 Navigation: ${from} → ${to}`;
      const formattedMessage = this.formatMessage('info', message, context);
      console.log(formattedMessage);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export the logger instance
export default logger;

// Export individual methods for convenience (these are already bound)
export const {
  error,
  warn,
  info,
  debug,
  trace,
  performance,
  api,
  map,
  store,
  userAction,
  componentLifecycle,
  redux,
  navigation,
  setLogLevel,
  getErrorLog,
  clearErrorLog
} = logger;
