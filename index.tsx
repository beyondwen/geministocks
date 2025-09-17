import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Register the service worker for PWA capabilities once the page is fully loaded.
window.addEventListener('load', () => {
  // Ensure service workers are supported
  if ('serviceWorker' in navigator) {
    // Construct the full URL to the service worker to avoid origin mismatches in specific hosting environments.
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
});

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