import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import SuperAdminPortal from './super-admin/SuperAdminPortal';

import './index.css';

const isSuperAdminRoute =
  window.location.pathname.startsWith('/super-admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSuperAdminRoute ? <SuperAdminPortal /> : <App />}
  </StrictMode>
);
