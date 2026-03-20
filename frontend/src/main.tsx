import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DevLogin } from './DevLogin';
import type { AuthContext } from './App';
import './styles/global.css';

const STORAGE_KEY = 'compass-dev-auth';

interface SavedAuth extends AuthContext {
  displayName: string;
  role: string;
  orgName: string;
}

function loadSavedAuth(): SavedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedAuth;
  } catch {
    return null;
  }
}

function Root() {
  const [auth, setAuth] = useState<SavedAuth | null>(loadSavedAuth);

  function handleAuthenticated(savedAuth: SavedAuth) {
    setAuth(savedAuth);
  }

  function handleSwitchUser() {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  if (!auth) {
    return <DevLogin onAuthenticated={handleAuthenticated} />;
  }

  return (
    <>
      {/* Currently-logged-in banner */}
      <div className="bg-gray-900/5 dark:bg-gray-100/5 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-1.5 flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-300">Dev</span>
          {' — '}
          <span className="font-medium text-gray-700 dark:text-gray-200">{auth.displayName}</span>
          {' '}
          <span className="text-gray-400 dark:text-gray-500">({auth.role.charAt(0) + auth.role.slice(1).toLowerCase()}, {auth.orgName})</span>
        </span>
        <button
          onClick={handleSwitchUser}
          className="text-gray-400 dark:text-gray-500 underline hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
        >
          Switch user
        </button>
      </div>
      <App basename="/" authContext={auth} />
    </>
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Compass: Root element #root not found. Cannot mount application.');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
