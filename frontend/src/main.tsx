import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { DevLogin } from './DevLogin';
import type { AuthContext } from './App';
import './styles/global.css';

const STORAGE_KEY = 'st6-dev-auth';

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
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-amber-800">
          <span className="font-medium">Dev mode</span>
          {' — logged in as '}
          <span className="font-medium">{auth.displayName}</span>
          {' '}
          <span className="text-amber-600">({auth.role.charAt(0) + auth.role.slice(1).toLowerCase()}, {auth.orgName})</span>
        </span>
        <button
          onClick={handleSwitchUser}
          className="text-amber-700 underline text-xs hover:text-amber-900"
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
  throw new Error('ST6: Root element #root not found. Cannot mount application.');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
