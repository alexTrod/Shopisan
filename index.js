import { registerRootComponent } from 'expo';

import { installE2EFixtures } from './src/config/e2eFixtures';
import App from './App';

// e2e build only: third-party HTTP APIs answer from fixtures.
if (process.env.EXPO_PUBLIC_E2E === '1') {
  installE2EFixtures();
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
