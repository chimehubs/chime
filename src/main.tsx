
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './app/App.tsx';
import './styles/index.css';
import { store } from './store';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';
import ErrorBoundary from './lib/ErrorBoundary';
import PreviewAccessGate from './app/components/security/PreviewAccessGate';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Provider store={store}>
      <AuthProvider>
        <ToastProvider>
          <PreviewAccessGate>
            <App />
          </PreviewAccessGate>
        </ToastProvider>
      </AuthProvider>
    </Provider>
  </ErrorBoundary>
);

const splash = document.getElementById('pwa-splash');
if (splash) {
  window.requestAnimationFrame(() => {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 300ms ease';
    setTimeout(() => splash.remove(), 350);
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration errors for now.
    });
  });
}
