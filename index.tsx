// FIX: The /// <reference> for vite/client was not being resolved.
// Explicitly declare the type for import.meta.env to resolve TypeScript errors
// related to accessing environment variables. This ensures type safety without
// relying on project-level configuration that may be missing.
interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

// FIX: To augment the global `ImportMeta` type from within a module, `declare global` is required.
// The previous attempt was creating a locally-scoped interface.
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

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