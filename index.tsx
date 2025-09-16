import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Function to register the service worker
const registerServiceWorker = () => {
  // Ensure service workers are supported
  if ('serviceWorker' in navigator) {
    // Construct an absolute URL for the service worker to prevent cross-origin errors
    // that can occur in certain environments (e.g., iframes or proxies).
    const swUrl = `${window.location.origin}/sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }
};

// Register the service worker for PWA capabilities.
// To avoid a race condition where the 'load' event fires before our script runs,
// we check the document's readyState. If it's already 'complete', we can register
// immediately. Otherwise, we wait for the 'load' event.
if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
