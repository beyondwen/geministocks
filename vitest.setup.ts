import { Storage } from 'happy-dom';

// Node 26 exposes an unconfigured localStorage placeholder that shadows the
// browser implementation provided by happy-dom.
if (typeof window !== 'undefined') {
  const storage = new Storage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
}
