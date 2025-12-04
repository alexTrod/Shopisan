# Automatic City Creation Documentation

## Overview

The app now automatically creates and updates cities in the Firestore database when stores are added or modified. This ensures that all cities are always up-to-date and available in search/filter functions.

## How It Works

### When a Store is Added/Updated

When a user creates or updates a store, the following process happens automatically:

1. **Store is saved** to Firestore with all its information
2. **City check** - The system checks if the city exists in the `cities` collection
3. **City creation** - If the city doesn't exist, it's automatically created
4. **City update** - If the city exists, its postal codes are updated
5. **Cache refresh** - The cities cache is refreshed so the new city is immediately available

### Implementation Details

#### New Utility File: `src/utils/cityManagement.js`

This file contains three main functions:

##### 1. `ensureCityExists(cityName, postalCode, latitude, longitude, countryId)`

**Purpose**: Creates a city if it doesn't exist, or updates it if it does.

**Parameters**:
- `cityName` (string) - Name of the city
- `postalCode` (string) - Postal code to add to the city
- `latitude` (number) - Latitude coordinate
- `longitude` (number) - Longitude coordinate
- `countryId` (string) - Country ID (default: 'FR')

**Returns**: Promise with result object containing:
```javascript
{
  success: boolean,
  cityId: string,
  existed: boolean,
  message: string
}
```

**What it does**:
- Checks if city exists in Firestore (searches by French and English names)
- If exists:
  - Updates postal codes array if the postal code is new
  - Updates `updated_at` timestamp
- If doesn't exist:
  - Creates new city document with:
    - Multi-language names (fr, en, es, it)
    - Coordinates (latitude, longitude)
    - Geohash for geolocation queries
    - Postal codes array
    - Metadata (creation date, active status, etc.)
  - Refreshes cities cache

##### 2. `updateCityStoreCount(cityName, increment)`

**Purpose**: Updates the store count for a city.

**Parameters**:
- `cityName` (string) - Name of the city
- `increment` (number) - Amount to increment (can be negative)

**Future Use**: This can be used to track how many stores are in each city.

##### 3. `getCityByName(cityName)`

**Purpose**: Retrieves city information by name.

**Returns**: City object or null if not found.

### City Data Structure

When a city is automatically created, it has the following structure:

```javascript
{
  name: {
    fr: "Paris",
    en: "Paris",
    es: "París",
    it: "Parigi"
  },
  country_id: "FR",
  coordinates: {
    latitude: 48.8566,
    longitude: 2.3522
  },
  geohash: "u09tvw0", // 7-character geohash
  postal_codes: ["75001", "75002"],
  is_active: true,
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T10:30:00Z",
  migrated: false,
  added_automatically: true,
  store_count: 1
}
```

### Geohash Implementation

The system includes a custom geohash generator that creates 7-character geohashes for efficient geolocation queries. Geohashes allow:
- Proximity searches
- Spatial indexing
- Efficient database queries for nearby cities

## Integration Points

### 1. Add Store Screen (`src/screens/app/add_store/index.js`)

After a store is successfully added:
```javascript
await addDoc(storesRef, storeData);

// Ensure city exists
const cityResult = await ensureCityExists(city, postalCode, latitude, longitude, "FR");
```

### 2. Handle Store Screen (`src/screens/app/handle_store/index.js`)

After a store is successfully updated:
```javascript
await updateDoc(storeRef, updatedData);

// Ensure city exists
const cityResult = await ensureCityExists(city, postalCode, latitude, longitude, "FR");
```

## Benefits

### ✅ Automatic Updates
- No manual city management required
- Cities are always in sync with stores

### ✅ Immediate Availability
- New cities are immediately available in search
- Cache is automatically refreshed

### ✅ Multi-language Support
- Cities created with names in 4 languages
- Supports future internationalization

### ✅ Rich Location Data
- Coordinates for mapping
- Geohash for proximity searches
- Postal codes for precise filtering

### ✅ Error Resilient
- Store creation/update succeeds even if city creation fails
- Errors are logged but don't block the main operation

## Cache Management

The cities cache is automatically managed:

1. **24-hour cache duration** - Cities are cached locally for 24 hours
2. **Automatic refresh** - When a new city is created, cache is refreshed
3. **Fallback** - If cache refresh fails, cache will update on next app load

## Testing

To verify the automatic city creation:

1. **Add a new store** with a city name that doesn't exist in the database
2. **Check the logs** - You should see: `✅ New city added to database: CityName`
3. **Verify in Firestore** - Check the `cities` collection for the new document
4. **Test search** - The new city should appear immediately in city search
5. **Add another store** in the same city - You should see: `City CityName already exists`

## Monitoring

The system logs important events:

- `✅ New city added to database: CityName` - New city created
- `✅ Updated postal codes for city: CityName` - Postal codes updated
- `✅ Cities cache refreshed` - Cache successfully refreshed
- Warnings and errors are logged if issues occur

## Future Enhancements

### Potential Improvements

1. **Store Count Tracking**
   - Automatically increment/decrement store count
   - Display popular cities

2. **Admin Review**
   - Flag automatically created cities for review
   - Admin panel for city management

3. **City Validation**
   - Validate city names against official databases
   - Prevent spam/incorrect entries

4. **Analytics**
   - Track which cities are most active
   - Geographic distribution insights

## Troubleshooting

### Issue: New city not appearing in search

**Solution**:
- Check console logs for errors
- Manually call `refreshCitiesCache()` from `citiesService.js`
- Wait 24 hours for cache to expire naturally
- Restart the app

### Issue: City creation fails

**Solution**:
- Check Firestore permissions
- Verify Firebase configuration
- Check internet connectivity
- Review error logs

### Issue: Duplicate cities

**Solution**:
- Cities are checked by name before creation
- If duplicates exist, use Firestore console to merge them
- The system prevents duplicates by querying before creating

## Security Considerations

- City creation requires valid store data (address, coordinates)
- Only authenticated users can add/update stores
- Cities inherit security from store operations
- Firestore rules should be configured to allow city writes

## Performance

- City checks use Firestore queries (fast)
- Cache reduces repeated database calls
- Geohash enables efficient proximity searches
- Minimal impact on store creation time (< 500ms)

## Related Documentation

- [Cities Migration Guide](./CITIES_MIGRATION_GUIDE.md)
- [Cities Service](../src/utils/citiesService.js)
- [Cities Cache](../src/utils/citiesCache.js)
- [Cities Configuration](../src/config/citiesConfig.js)

