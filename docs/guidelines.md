# Logging Guidelines

## Overview
This document outlines the logging standards and best practices for the Shopisan application. Consistent logging helps with debugging, monitoring, and understanding user behavior.

## Log Levels

### 🔍 DEBUG (console.log)
- **Purpose**: Detailed information for debugging
- **Use cases**: 
  - Function entry/exit points
  - Variable values during development
  - Step-by-step process tracking
- **Example**: `console.log('🔍 Fetching suggestions for query:', query);`

### ⚠️ WARN (console.warn)
- **Purpose**: Warning messages for non-critical issues
- **Use cases**:
  - API fallbacks
  - Deprecated feature usage
  - Performance warnings
- **Example**: `console.warn('❌ Geocoding failed, using only predefined cities:', error);`

### ❌ ERROR (console.error)
- **Purpose**: Error messages for critical issues
- **Use cases**:
  - API failures
  - Data validation errors
  - Unexpected exceptions
- **Example**: `console.error('❌ Error fetching suggestions:', error);`

## Emoji Prefixes

Use emojis to quickly identify log categories:

| Emoji | Category | Description |
|-------|----------|-------------|
| 🔍 | Search | Search-related operations |
| 🏙️ | Cities | City lookup and geocoding |
| 🏪 | Stores | Store-related operations |
| 📍 | Location | Location and coordinates |
| 📊 | Data | Data processing and statistics |
| 🎯 | User Action | User interactions and selections |
| ✅ | Success | Successful operations |
| ❌ | Error | Errors and failures |
| ⚠️ | Warning | Warnings and fallbacks |
| 🔄 | State | State changes and updates |

## Logging Standards

### 1. Function Entry/Exit Logging
```javascript
const fetchCitySuggestions = async (query) => {
  console.log('🏙️ Searching for cities with query:', query);
  
  try {
    // ... function logic
    console.log('🏙️ Final city suggestions:', results);
    return results;
  } catch (error) {
    console.error('❌ Error in fetchCitySuggestions:', error);
    throw error;
  }
};
```

### 2. Data Flow Logging
```javascript
console.log('📊 Final suggestions breakdown:');
console.log('  - Cities from predefined list:', predefinedCount);
console.log('  - Cities from geocoding:', geocodedCount);
console.log('  - Stores from local data:', storeCount);
console.log('  - Total suggestions:', totalCount);
```

### 3. User Interaction Logging
```javascript
console.log('🎯 Suggestion selected:', {
  label: suggestion.label,
  type: suggestion.type,
  source: suggestion.source || 'unknown'
});
```

### 4. API Response Logging
```javascript
console.log('🌐 Geocoding results:', locations.length, 'locations found');
console.log('🌐 Geocoded location:', { 
  name: cityName, 
  coords: location 
});
```

## Search Bar Specific Logging

### City Search Process
```javascript
// 1. Query received
console.log('🔍 Fetching suggestions for query:', query);

// 2. Predefined cities search
console.log('📋 Predefined cities found:', predefinedCities.length);
console.log('📋 Predefined cities:', predefinedCities.slice(0, 3));

// 3. Geocoding attempt
console.log('🌐 Attempting geocoding for additional cities...');
console.log('🌐 Geocoding results:', locations.length, 'locations found');

// 4. Final results
console.log('🏙️ Final city suggestions:', allCities.map(c => `${c.name} (${c.source})`));
```

### Store Search Process
```javascript
// 1. Store search initiation
console.log('🏪 Searching stores with query:', query);
console.log('🏪 Total stores available:', allStores.length);

// 2. Matching results
console.log('🏪 Matching stores found:', matchingStores.length);
console.log('🏪 Store names:', matchingStores.map(s => s.name));
```

### Suggestion Selection
```javascript
// 1. User selection
console.log('🎯 Suggestion selected:', {
  label: suggestion.label,
  type: suggestion.type,
  source: suggestion.source || 'unknown'
});

// 2. Processing
console.log('🏙️ Processing city selection...');
console.log('🏪 Processing store selection...');
```

## Performance Logging

### Timing Operations
```javascript
const startTime = Date.now();
// ... operation
const endTime = Date.now();
console.log('⏱️ Operation completed in:', endTime - startTime, 'ms');
```

### Memory Usage
```javascript
console.log('💾 Memory usage:', {
  suggestionsCount: suggestions.length,
  totalStores: allStores.length,
  cacheSize: cache.size
});
```

## Error Logging

### Structured Error Logging
```javascript
try {
  // ... operation
} catch (error) {
  console.error('❌ Error in operation:', {
    message: error.message,
    stack: error.stack,
    context: {
      query: searchQuery,
      timestamp: new Date().toISOString()
    }
  });
}
```

### API Error Logging
```javascript
if (!response.ok) {
  console.error('❌ API Error:', {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    data: await response.text()
  });
}
```

## Data Source Tracking

### Source Attribution
Always log the source of data:
```javascript
console.log('📊 Data sources:', {
  predefinedCities: predefinedCount,
  geocodedCities: geocodedCount,
  localStores: storeCount,
  apiStores: apiStoreCount
});
```

### Cache Status
```javascript
console.log('💾 Cache status:', {
  hit: cacheHit,
  miss: cacheMiss,
  size: cache.size,
  ttl: cache.ttl
});
```

## Best Practices

### 1. Be Specific
❌ Bad: `console.log('Error occurred');`
✅ Good: `console.error('❌ Geocoding failed for query:', query, error);`

### 2. Use Structured Data
❌ Bad: `console.log('User selected:', city, 'type:', type);`
✅ Good: `console.log('🎯 User selection:', { city, type, source, timestamp });`

### 3. Include Context
```javascript
console.log('🔍 Search context:', {
  query: searchQuery,
  userLocation: currentLocation,
  filters: activeFilters,
  timestamp: new Date().toISOString()
});
```

### 4. Group Related Logs
```javascript
console.group('🏙️ City Search Process');
console.log('Query:', query);
console.log('Predefined results:', predefinedCities);
console.log('Geocoding results:', geocodedCities);
console.log('Final selection:', selectedCity);
console.groupEnd();
```

### 5. Conditional Logging
```javascript
if (__DEV__) {
  console.log('🔍 Debug info:', debugData);
}
```

## Logging in Production

### Environment-Specific Logging
```javascript
const log = {
  debug: (...args) => __DEV__ && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};
```

### Performance Monitoring
```javascript
// Only log performance data in development
if (__DEV__) {
  console.log('⏱️ Performance:', {
    searchTime: searchEndTime - searchStartTime,
    renderTime: renderEndTime - renderStartTime
  });
}
```

## Tools and Extensions

### Recommended Console Extensions
- **React Native Debugger**: Enhanced console for React Native
- **Flipper**: Facebook's debugging platform
- **Chrome DevTools**: For web debugging

### Log Analysis Tools
- **Sentry**: Error tracking and performance monitoring
- **Firebase Analytics**: User behavior tracking
- **Custom Analytics**: In-house logging system

## Maintenance

### Regular Review
- Review logs weekly for patterns
- Remove debug logs before production releases
- Update logging guidelines based on team feedback

### Performance Impact
- Avoid logging in hot paths
- Use conditional logging for debug information
- Consider log level filtering in production

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: Development Team
