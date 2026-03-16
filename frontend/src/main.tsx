import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App basename="/" authContext={{ token: 'dev-token', userId: 'dev-user', orgId: 'dev-org' }} />
    </React.StrictMode>
  );
}
