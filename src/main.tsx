import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure window.fetch is safely assignable in environments where browser extensions wrap window.fetch
try {
  let currentFetch = window.fetch?.bind(window);
  if (currentFetch) {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: () => currentFetch,
      set: (nextFetch) => {
        if (typeof nextFetch === 'function') {
          currentFetch = nextFetch;
        }
      },
    });
  }
} catch {
  // Ignore if descriptor is locked
}

createRoot(document.getElementById('root')!).render(<App />);
