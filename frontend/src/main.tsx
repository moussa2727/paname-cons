// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer, toast, ToastOptions, ToastContent } from 'react-toastify';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';

// ==================== TYPES ET INTERFACES ====================
export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface CustomToastOptions extends ToastOptions {
  type?: ToastType;
  mobileOptimized?: boolean;
}

interface ToastManagerOptions extends ToastOptions {
  toastId?: string;
  containerId?: string;
}

// ==================== TOAST MANAGER ====================
class ToastManager {
  private activeToasts: Set<string | number> = new Set();
  private lastToastTime: number = 0;
  private readonly debounceDelay: number = 150;
  private static instance: ToastManager;

  private constructor() {}

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(
    content: ToastContent,
    options: CustomToastOptions = {}
  ): string | number | null {
    const now = Date.now();
    const messageHash = this.generateHash(content?.toString() || '');

    if (now - this.lastToastTime < this.debounceDelay) {
      console.debug('Toast ignoré (anti-rebond)');
      return null;
    }

    if (this.activeToasts.has(messageHash)) {
      console.debug('Toast identique déjà affiché');
      return null;
    }

    this.lastToastTime = now;

    const defaultOptions: ToastOptions = {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      theme: 'light',
      toastId: messageHash,
      containerId: 'main-toast-container',
      style: {
        fontSize: '15px',
        maxWidth: 'calc(100vw - 40px)',
        borderRadius: '10px',
        margin: '10px',
        minHeight: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        wordBreak: 'break-word' as const,
        overflowWrap: 'break-word' as const,
        whiteSpace: 'pre-line' as const,
      },
    };

    const mergedOptions: ToastOptions = {
      ...defaultOptions,
      ...options,
      toastId: messageHash,
    };

    if (options.limit === 1 || !options.limit) {
      this.clearAll();
    }

    let toastId: string | number;
    switch (options.type) {
      case 'success':
        toastId = toast.success(content, mergedOptions);
        break;
      case 'error':
        toastId = toast.error(content, mergedOptions);
        break;
      case 'warning':
        toastId = toast.warning(content, mergedOptions);
        break;
      case 'info':
        toastId = toast.info(content, mergedOptions);
        break;
      default:
        toastId = toast(content, mergedOptions);
    }

    this.activeToasts.add(messageHash);

    const autoClose = mergedOptions.autoClose || 3000;
    setTimeout(() => {
      this.removeToast(messageHash);
    }, autoClose);

    return toastId;
  }

  private generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `toast_${Math.abs(hash)}`;
  }

  private removeToast(hash: string): void {
    this.activeToasts.delete(hash);
    const toastElement = document.querySelector(`[id="${hash}"]`);
    if (toastElement && toastElement.parentNode) {
      setTimeout(() => {
        toastElement.parentNode?.removeChild(toastElement);
      }, 100);
    }
  }

  clearAll(): void {
    this.activeToasts.forEach(hash => {
      toast.dismiss(hash);
      this.removeToast(hash);
    });
    this.activeToasts.clear();
    this.cleanupDOM();
  }

  private cleanupDOM(): void {
    setTimeout(() => {
      const containers = document.querySelectorAll(
        '[id^="toast-container-"], .Toastify'
      );
      containers.forEach(container => {
        const toasts = container.querySelectorAll('.Toastify__toast');
        toasts.forEach(toastEl => {
          if (!toastEl.classList.contains('Toastify__toast--rtl')) {
            toastEl.remove();
          }
        });
      });
    }, 500);
  }

  success(
    content: ToastContent,
    options: Omit<CustomToastOptions, 'type'> = {}
  ): string | number | null {
    return this.show(content, { ...options, type: 'success' });
  }

  error(
    content: ToastContent,
    options: Omit<CustomToastOptions, 'type'> = {}
  ): string | number | null {
    return this.show(content, { ...options, type: 'error' });
  }

  warning(
    content: ToastContent,
    options: Omit<CustomToastOptions, 'type'> = {}
  ): string | number | null {
    return this.show(content, { ...options, type: 'warning' });
  }

  info(
    content: ToastContent,
    options: Omit<CustomToastOptions, 'type'> = {}
  ): string | number | null {
    return this.show(content, { ...options, type: 'info' });
  }

  mobile(
    content: ToastContent,
    options: CustomToastOptions = {}
  ): string | number | null {
    const mobileOptions: CustomToastOptions = {
      position: 'bottom-center',
      autoClose: 2500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      style: {
        fontSize: '14px',
        maxWidth: '90vw',
        borderRadius: '8px',
        margin: '8px',
        minHeight: '44px',
        padding: '12px',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
      },
      ...options,
      mobileOptimized: true,
    };

    return this.show(content, mobileOptions);
  }
}

// Export d'une instance unique
export const toastManager = ToastManager.getInstance();

// Fonctions pratiques d'exportation
export const showToast = (
  content: ToastContent,
  options: CustomToastOptions = {}
) => toastManager.show(content, options);

export const showSuccess = (
  content: ToastContent,
  options: Omit<CustomToastOptions, 'type'> = {}
) => toastManager.success(content, options);

export const showError = (
  content: ToastContent,
  options: Omit<CustomToastOptions, 'type'> = {}
) => toastManager.error(content, options);

export const showWarning = (
  content: ToastContent,
  options: Omit<CustomToastOptions, 'type'> = {}
) => toastManager.warning(content, options);

export const showInfo = (
  content: ToastContent,
  options: Omit<CustomToastOptions, 'type'> = {}
) => toastManager.info(content, options);

export const showMobileToast = (
  content: ToastContent,
  options: CustomToastOptions = {}
) => toastManager.mobile(content, options);

// ==================== HOOK useToast ====================
import { useCallback, useEffect, useRef } from 'react';

export const useToast = () => {
  const lastToastRef = useRef<string | number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (lastToastRef.current) {
        toastManager.clearAll();
      }
    };
  }, []);

  const toast = useCallback(
    (
      content: React.ReactNode,
      options: CustomToastOptions = {}
    ): string | number | null => {
      if (!mountedRef.current) return null;
      
      if (lastToastRef.current) {
        toastManager.clearAll();
      }

      const toastId = showToast(content, {
        ...options,
        onClose: () => {
          lastToastRef.current = null;
          options.onClose?.();
        },
      });

      lastToastRef.current = toastId;
      return toastId;
    },
    []
  );

  const success = useCallback(
    (
      content: React.ReactNode,
      options: Omit<CustomToastOptions, 'type'> = {}
    ) => {
      if (!mountedRef.current) return null;
      return showSuccess(content, options);
    },
    []
  );

  const error = useCallback(
    (
      content: React.ReactNode,
      options: Omit<CustomToastOptions, 'type'> = {}
    ) => {
      if (!mountedRef.current) return null;
      return showError(content, options);
    },
    []
  );

  const warning = useCallback(
    (
      content: React.ReactNode,
      options: Omit<CustomToastOptions, 'type'> = {}
    ) => {
      if (!mountedRef.current) return null;
      return showWarning(content, options);
    },
    []
  );

  const info = useCallback(
    (
      content: React.ReactNode,
      options: Omit<CustomToastOptions, 'type'> = {}
    ) => {
      if (!mountedRef.current) return null;
      return showInfo(content, options);
    },
    []
  );

  const mobile = useCallback(
    (content: React.ReactNode, options: CustomToastOptions = {}) => {
      if (!mountedRef.current) return null;
      return showMobileToast(content, options);
    },
    []
  );

  const dismiss = useCallback((toastId?: string | number) => {
    if (toastId) {
      toastManager.clearAll();
    } else if (lastToastRef.current) {
      toastManager.clearAll();
      lastToastRef.current = null;
    }
  }, []);

  const clearAll = useCallback(() => {
    toastManager.clearAll();
    lastToastRef.current = null;
  }, []);

  return {
    toast,
    success,
    error,
    warning,
    info,
    mobile,
    dismiss,
    clearAll,
    manager: toastManager,
  };
};

// ==================== COMPOSANT GLOBAL TOAST CONTAINER ====================
const GlobalToastContainer: React.FC = () => {
  const toastOptions: ToastManagerOptions = {
    containerId: 'main-toast-container',
  };

  return (
    <ToastContainer
      position='top-right'
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick={true}
      pauseOnHover={false}
      draggable={false}
      theme='light'
      limit={1}
      pauseOnFocusLoss={false}
      enableMultiContainer={false}
      containerId={toastOptions.containerId}
      style={{
        fontSize: '14px',
        maxWidth: '90vw',
        width: 'auto',
        marginTop: 'env(safe-area-inset-top, 0px)',
        zIndex: 9999,
      }}
      toastStyle={{
        borderRadius: '12px',
        padding: '12px 16px',
        margin: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minHeight: '44px',
        backgroundColor: '#ffffff',
      }}
      bodyStyle={{
        padding: 0,
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      progressStyle={{
        background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
      }}
    />
  );
};

// ==================== RENDU PRINCIPAL ====================
const rootElement = document.getElementById('root') as HTMLElement;

if (!rootElement) {
  throw new Error("Élément 'root' non trouvé dans le DOM");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <App />
          <GlobalToastContainer />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);