import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import { GlobalLoading } from './components/system/GlobalLoading';
import { OfflineGuard } from './components/system/OfflineGuard';
import { OfflineSyncProvider } from './context/OfflineSyncProvider';
import { ThemeProvider } from './context/ThemeProvider';
import { ToastProvider } from './context/ToastProvider';
import { PluginPlatformProvider } from './plugins/runtime';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <OfflineSyncProvider>
              <OfflineGuard>
                <PluginPlatformProvider>
                  <GlobalLoading />
                  <App />
                </PluginPlatformProvider>
              </OfflineGuard>
            </OfflineSyncProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
