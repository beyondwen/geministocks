import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider } from './hooks/useI18n';
import { initSentry, SentryErrorBoundary } from './services/sentry';

// Initialize Sentry before rendering
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<ErrorFallback />}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </SentryErrorBoundary>
  </React.StrictMode>
);

// Error fallback component
function ErrorFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#333' }}>
        Something went wrong
      </h1>
      <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
        We apologize for the inconvenience. The error has been reported.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Refresh Page
      </button>
    </div>
  );
}
