"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModalType = 'alert' | 'confirm' | 'success' | 'error' | 'warning';

interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (message: string, title?: string, type?: ModalType) => Promise<void>;
  showConfirm: (message: string, title?: string, type?: ModalType) => Promise<boolean>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
  showWarning: (message: string, title?: string) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const closeModal = (result: boolean = false) => {
    if (resolveCallback) {
      resolveCallback(result);
      setResolveCallback(null);
    }
    setModal(null);
  };

  const showAlert = (message: string, title?: string, type: ModalType = 'alert'): Promise<void> => {
    return new Promise((resolve) => {
      setModal({
        message,
        title,
        type,
        confirmText: 'OK',
      });
      setResolveCallback(() => () => {
        resolve();
      });
    });
  };

  const showConfirm = (message: string, title?: string, type: ModalType = 'confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({
        message,
        title,
        type,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
      });
      setResolveCallback(() => resolve);
    });
  };

  const showSuccess = (message: string, title?: string): Promise<void> => {
    return showAlert(message, title || 'Success', 'success');
  };

  const showError = (message: string, title?: string): Promise<void> => {
    return showAlert(message, title || 'Error', 'error');
  };

  const showWarning = (message: string, title?: string): Promise<void> => {
    return showAlert(message, title || 'Warning', 'warning');
  };

  const getIcon = (type: ModalType) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'confirm':
        return (
          <div className="w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showSuccess, showError, showWarning }}>
      {children}
      
      {modal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal(false);
            }
          }}
        >
          <div 
            className="relative w-full max-w-md rounded-2xl border-2 border-dark-600 bg-dark-800 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              {/* Icon */}
              <div className="flex justify-center">
                {getIcon(modal.type || 'alert')}
              </div>

              {/* Title */}
              {modal.title && (
                <h3 className="text-xl font-semibold text-center text-text-primary">
                  {modal.title}
                </h3>
              )}

              {/* Message */}
              <p className="text-sm text-center text-text-secondary leading-relaxed whitespace-pre-wrap">
                {modal.message}
              </p>

              {/* Buttons */}
              <div className="flex gap-3 pt-2 justify-center">
                {modal.cancelText && (
                  <button
                    onClick={() => closeModal(false)}
                    className="px-6 py-2.5 rounded-lg bg-dark-700 border border-dark-600 text-text-primary hover:bg-dark-600 transition-all font-medium"
                  >
                    {modal.cancelText}
                  </button>
                )}
                <button
                  onClick={() => closeModal(true)}
                  className={cn(
                    "px-6 py-2.5 rounded-lg font-semibold transition-all",
                    modal.type === 'error' 
                      ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500"
                      : modal.type === 'success'
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500"
                      : modal.type === 'warning'
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-dark-900 hover:from-amber-400 hover:to-amber-500"
                      : "bg-gradient-to-r from-cyan-500 to-cyan-600 text-dark-900 hover:from-cyan-400 hover:to-cyan-500"
                  )}
                >
                  {modal.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
