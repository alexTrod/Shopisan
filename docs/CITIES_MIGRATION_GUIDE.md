# Cities Data Migration Guide

## Overview

This guide documents the migration from a static `cities.json` file to a dynamic Firestore-based cities management system with proper internationalization support.

## What Changed

### Before
- Static `cities.json` file with 361 hardcoded city names
- Only French language support
- No synchronization with database
- Limited scalability

### After
- Dynamic cities data from Firestore
- Multi-language support (French, English, Spanish, Italian)
- Caching for performance
- Easy to add/update cities via admin panel
- Proper geolocation data (latitude, longitude, geohash)

## New Files Created

### 1. `src/utils/citiesService.js`
- **Purpose**: Main service for fetching cities from Firestore
- **Features**: 
  - Localized city names based on user language
  - Search functionality
  - Country filtering
  - Caching integration

### 2. `src/utils/citiesCache.js`
- **Purpose**: Local caching system for cities data
- **Features**:
  - 24-hour cache duration
  - AsyncStorage integration
  - Cache validation
  - Performance optimization

### 3. `src/utils/migrateCities.js`
- **Purpose**: Migration script to move cities.json data to Firestore
- **Features**:
  - Country mapping for existing cities
  - Batch processing
  - Error handling
  - Progress tracking

### 4. `src/utils/runMigration.js`
- **Purpose**: Simple script to run the migration
- **Usage**: Run once to populate Firestore with cities data

## Updated Files

### Components Updated
- `src/components/search-bar/index.js` - Now uses Firestore cities
- `src/context/StoreContext.js` - Updated filtering logic
- `src/screens/app/map/index.js` - Updated city suggestions
- `src/screens/app/home/index.js` - Updated city suggestions
- All backup/copy files updated

## Firestore Data Structure

### Cities Collection Structure
```javascript
{
  "name": {
    "fr": "Paris",
    "en": "Paris", 
    "es": "París",
    "it": "Parigi"
  },
  "country_id": "FR",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "geohash": "u09tvq",
  "postalCodes": ["75001", "75002", ...],
  "isActive": true,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## How to Use

### 1. Run Migration (One-time setup)
```javascript
import { runCitiesMigration } from './src/utils/runMigration';

// Run the migration
await runCitiesMigration();
```

### 2. Using Cities Service
```javascript
import { getCitiesForSearch, getCitiesByCountry } from './src/utils/citiesService';

// Search for cities
const cities = await getCitiesForSearch('Paris', 10);

// Get cities by country
const frenchCities = await getCitiesByCountry('FR');
```

### 3. Using Cache
```javascript
import { getCachedCities, setCachedCities } from './src/utils/citiesCache';

// Get cached cities
const cachedCities = await getCachedCities();

// Set cities in cache
await setCachedCities(cities);
```

## Benefits

### Performance
- ✅ **Caching**: 24-hour local cache reduces Firestore calls
- ✅ **Offline Support**: Cached data works without internet
- ✅ **Fast Search**: Local filtering after initial load

### Scalability
- ✅ **Dynamic Data**: Easy to add/update cities via admin
- ✅ **Multi-language**: Proper localization support
- ✅ **Geolocation**: Rich location data for better UX

### Maintainability
- ✅ **Single Source**: Firestore as single source of truth
- ✅ **Type Safety**: Better error handling
- ✅ **Modular**: Clean separation of concerns

## Migration Steps

### Step 1: Run Migration Script
```bash
# In your app, run the migration once
import { runCitiesMigration } from './src/utils/runMigration';
await runCitiesMigration();
```

### Step 2: Verify Data
Check your Firestore console to ensure cities are properly migrated with the correct structure.

### Step 3: Test Functionality
- Test city search in the app
- Verify multi-language support
- Check caching behavior

## Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check Firestore permissions
   - Verify Firebase configuration
   - Check console for specific errors

2. **Cities Not Loading**
   - Check network connection
   - Verify Firestore rules
   - Check cache status

3. **Language Issues**
   - Verify i18n configuration
   - Check city document structure
   - Ensure language keys exist

### Debug Commands
```javascript
// Check cache status
import { getCacheInfo } from './src/utils/citiesCache';
const cacheInfo = await getCacheInfo();
console.log('Cache info:', cacheInfo);

// Clear cache if needed
import { clearCitiesCache } from './src/utils/citiesCache';
await clearCitiesCache();
```

## Future Enhancements

### Planned Features
- [ ] Admin panel for city management
- [ ] Bulk city import/export
- [ ] City popularity tracking
- [ ] Advanced search filters
- [ ] City suggestions based on user location

### API Extensions
- [ ] REST API for city management
- [ ] Webhook for city updates
- [ ] Analytics integration
- [ ] A/B testing for city suggestions

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify Firestore data structure
3. Test with cache cleared
4. Check network connectivity

## Rollback Plan

If issues occur, you can temporarily revert by:
1. Restoring the old `cities.json` import
2. Reverting the component changes
3. The migration script is safe to run multiple times

The new system is designed to be backward compatible and can be safely rolled back if needed.
