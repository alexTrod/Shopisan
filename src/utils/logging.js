// Legacy logging utility - now redirects to the new centralized logger
// This file is kept for backward compatibility during migration

import logger, { 
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
  navigation
} from './logger';

// Export the new logger methods
export {
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
  navigation
};

// Legacy function for backward compatibility
const legacyLog = (description = '', payload = '', timestamp = new Date().getTime().toString()) => {
  info(`${description} | ${payload}`, { timestamp });
};

// Legacy error logging
export const logError = (description = '', payload = '', timestamp = new Date().getTime().toString()) => {
  error(`${description} | ${payload}`, { timestamp });
};

// Export legacy function
export default legacyLog;

// Log deprecation warning
if (__DEV__) {
  console.warn(
    '⚠️  The logging utility has been updated. ' +
    'Please use the new logger from "./logger" instead of "./logging". ' +
    'This file will be removed in a future version.'
  );

}
