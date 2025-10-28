/// <reference types="vite/client" />

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './hooks/useI18n';
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ClerkProvider>
  </React.StrictMode>
);