import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import SuperAdminApp from './super-admin/SuperAdminApp';

import './index.css';

const isSuperAdminRoute =
  window.location.pathname.startsWith('/super-admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSuperAdminRoute ? <SuperAdminApp /> : <App />}
  </StrictMode>
);
