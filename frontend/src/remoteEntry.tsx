// remoteEntry.tsx — Module Federation remote entry point.
// The host app imports this module to mount the Compass commit module.
//
// Usage from host:
//   import CompassApp from 'compass/App';
//   <CompassApp basename="/compass" authContext={hostAuth} />
//
// The host is responsible for:
//   1. Providing authContext (token, userId, orgId, role, displayName)
//   2. Loading Compass design tokens (import 'compass/styles' or include global.css)
//   3. Loading Google Fonts: Inter (400/500/600) and Newsreader (400i/700)
//   4. Listening for 'compass:auth:expired' CustomEvent on window for 401 handling

import App from './App';
import type { AuthContext } from './App';

// Re-export the App component as the default remote entry
export default App;

// Named exports for flexibility
export { App };
export type { AuthContext };

// Export the CSS path so hosts can import design tokens
// Usage: import 'compass/styles';
export { default as styles } from './styles/global.css?inline';
