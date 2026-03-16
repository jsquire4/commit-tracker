import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('ST6: Root element #root not found. Cannot mount application.');
}

const devAuthContext = { token: 'dev-token', userId: 'dev-user', orgId: 'dev-org' };

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App basename="/" authContext={devAuthContext} />
  </React.StrictMode>
);
