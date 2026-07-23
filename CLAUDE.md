# Shopisan Mobile App

React Native mobile marketplace app built with Expo, Redux, and Firebase.

## Quick Commands

```bash
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
eas build --platform ios --profile preview  # Build iOS preview
eas build --platform android --profile preview  # Build Android preview
firebase deploy --only functions  # Deploy Cloud Functions
firebase emulators:start  # Start local emulators
```

## Architecture

```
src/
├── Redux/           # State management (slices, store)
├── Routes/          # Navigation configuration
├── components/      # Reusable UI components
├── config/          # App configuration
├── context/         # React contexts
├── hooks/           # Custom hooks
├── screens/         # Screen components (app/, auth/)
├── services/        # API & business logic services
├── translations/    # i18n (EN/FR)
└── utils/           # Utilities, constants, helpers
functions/           # Firebase Cloud Functions
```

## Key Patterns

### Redux State Management
- Uses Redux Toolkit with slices pattern
- Slices: `userSlice`, `storeSlice`, `localeSlice`, `searchSlice`
- Persist with redux-persist (AsyncStorage)
- Access: `useSelector(state => state.user.currentUser)`

### Services Layer
- `LocationManager` - Singleton for user location tracking
- `StoreService` - Store CRUD operations with Firebase
- `SearchService` - Debounced search with caching
- `AuthService` - Authentication flows

### Component Conventions
- Functional components with hooks
- StyleSheet for styles (no inline except dynamic)
- Use `AppColors` from `utils/colors.js`
- Use `responsiveSize()` for dimensions
- Props destructuring at component level

### Navigation
- React Navigation v6
- Stack + Tab navigators
- Auth flow: `AuthStack` vs `AppStack`
- Deep linking configured

## Styling

```javascript
import { AppColors } from '../utils/colors';
import { responsiveSize } from '../utils/responsive';

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    padding: responsiveSize(16),
  },
});
```

## Internationalization (i18n)

```javascript
import i18n from '../translations';
// or
import { useTranslation } from '../hooks/useTranslation';

// Usage
i18n.t('home.welcome')
const { t, locale } = useTranslation();
```

Translation files: `src/translations/index.js` (EN & FR sections)

## Firebase Integration

- **Auth**: Email/password, email verification
- **Firestore**: Collections - `users`, `stores`, `categories`
- **Storage**: Store images, user avatars
- **Functions**: Email sending, store validation webhooks

## Maps Integration

- Provider: `react-native-maps` with Google Maps
- Location: `expo-location` for permissions & tracking
- Geocoding: Google Geocoding API with caching
- Distance: Haversine formula calculations

## Admin Scripts

```bash
# Delete users and all related data (Auth, Firestore docs, stores, posts)
node scripts/delete-users.js email1@example.com email2@example.com

# Requires serviceAccountKey.json in project root
# Get from: Firebase Console > Project Settings > Service Accounts > Generate new private key
```

## Testing

```bash
npm test               # Run Jest tests
npm test -- --watch    # Watch mode
npm test -- --coverage # Coverage report
```

## E2E Testing (Maestro)

```bash
# Install Maestro CLI (one-time)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run all E2E tests
npm run e2e

# Run login flow only
npm run e2e:login

# Run with env vars (CI)
maestro test --env EMAIL=user@example.com --env PASSWORD=pass .maestro/flows/login.yaml
```

Test files: `.maestro/flows/`

## Environment

- Expo SDK 51
- React Native 0.74
- Node 18+ required
- Firebase project: shopisan-xxxxx

## Git Commits

- Do NOT include Co-Authored-By or any Claude/AI attribution in commit messages
- Use conventional commits format (feat, fix, refactor, test, docs, chore)
