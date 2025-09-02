// Redux logging middleware that integrates with our centralized logging system
import { redux } from './logger';
import { getLogConfig } from './logging.config';

// Redux logging middleware
export const reduxLogger = store => next => action => {
  let config;
  try {
    config = getLogConfig();
  } catch (error) {
    // Fallback to basic logging if config fails
    config = { redux: true };
  }
  
  // Only log if Redux logging is enabled
  if (!config.redux) {
    return next(action);
  }

  const startTime = Date.now();
  const prevState = store.getState();
  
  // Log the action
  redux(`Action: ${action.type}`, {
    action: action.type,
    payload: action.payload,
    timestamp: new Date().toISOString()
  });

  // Execute the action
  const result = next(action);
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const nextState = store.getState();
  
  // Log state changes
  const stateChanged = JSON.stringify(prevState) !== JSON.stringify(nextState);
  
  if (stateChanged) {
    redux(`State changed after ${action.type}`, {
      action: action.type,
      duration: `${duration}ms`,
      stateKeys: Object.keys(nextState),
      changedKeys: Object.keys(nextState).filter(key => 
        JSON.stringify(prevState[key]) !== JSON.stringify(nextState[key])
      )
    });
  }

  // Log slow actions
  if (duration > 16) { // 16ms threshold
    redux(`Slow action detected: ${action.type} took ${duration}ms`, {
      action: action.type,
      duration: `${duration}ms`,
      threshold: '16ms'
    });
  }

  return result;
};

// Enhanced Redux logger with performance monitoring
export const enhancedReduxLogger = store => next => action => {
  let config;
  try {
    config = getLogConfig();
  } catch (error) {
    // Fallback to basic logging if config fails
    config = { redux: true };
  }
  
  if (!config.redux) {
    return next(action);
  }

  const startTime = performance.now();
  const prevState = store.getState();
  
  // Log action start
  redux(`Action started: ${action.type}`, {
    action: action.type,
    payload: action.payload,
    timestamp: new Date().toISOString()
  });

  try {
    // Execute the action
    const result = next(action);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const nextState = store.getState();
    
    // Log successful action completion
    redux(`Action completed: ${action.type}`, {
      action: action.type,
      duration: `${duration.toFixed(2)}ms`,
      success: true
    });

    // Log state changes
    const stateChanged = JSON.stringify(prevState) !== JSON.stringify(nextState);
    
    if (stateChanged) {
      redux(`State updated: ${action.type}`, {
        action: action.type,
        changedKeys: Object.keys(nextState).filter(key => 
          JSON.stringify(prevState[key]) !== JSON.stringify(nextState[key])
        )
      });
    }

    // Performance warnings
    if (duration > 16) {
      redux(`Performance warning: ${action.type} took ${duration.toFixed(2)}ms`, {
        action: action.type,
        duration: `${duration.toFixed(2)}ms`,
        threshold: '16ms',
        type: 'warning'
      });
    }

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log action failure
    redux(`Action failed: ${action.type}`, {
      action: action.type,
      duration: `${duration.toFixed(2)}ms`,
      error: error.message,
      stack: error.stack,
      success: false
    });
    
    throw error;
  }
};

// Selective Redux logger (only logs specific actions)
export const selectiveReduxLogger = (actionsToLog = []) => store => next => action => {
  let config;
  try {
    config = getLogConfig();
  } catch (error) {
    // Fallback to basic logging if config fails
    config = { redux: true };
  }
  
  if (!config.redux) {
    return next(action);
  }

  // Only log specified actions
  if (actionsToLog.length > 0 && !actionsToLog.includes(action.type)) {
    return next(action);
  }

  const startTime = performance.now();
  
  redux(`Action: ${action.type}`, {
    action: action.type,
    payload: action.payload,
    timestamp: new Date().toISOString()
  });

  const result = next(action);
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  redux(`Action completed: ${action.type}`, {
    action: action.type,
    duration: `${duration.toFixed(2)}ms`
  });

  return result;
};

// Production-safe Redux logger (minimal logging)
export const productionReduxLogger = store => next => action => {
  // In production, only log errors and critical actions
  const criticalActions = [
    'user/SIGN_OUT',
    'user/SIGN_IN',
    'app/CRASH',
    'app/ERROR'
  ];
  
  if (!criticalActions.includes(action.type)) {
    return next(action);
  }

  const startTime = performance.now();
  
  try {
    const result = next(action);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    redux(`Critical action: ${action.type}`, {
      action: action.type,
      duration: `${duration.toFixed(2)}ms`,
      environment: 'production'
    });
    
    return result;
  } catch (error) {
    redux(`Critical action failed: ${action.type}`, {
      action: action.type,
      error: error.message,
      environment: 'production'
    });
    
    throw error;
  }
};

// Default export
export default enhancedReduxLogger;
