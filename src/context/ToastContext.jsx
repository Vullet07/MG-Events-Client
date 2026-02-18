import { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const pushToast = (type, message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duration = options.duration ?? 2800;

    const next = {
      id,
      type,
      message,
      actionLabel: options.actionLabel || "",
      onAction: options.onAction || null
    };

    setToasts((prev) => [...prev, next]);

    if (duration > 0) {
      window.setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const api = useMemo(
    () => ({
      success: (message, options) => pushToast("success", message, options),
      error: (message, options) => pushToast("error", message, options),
      info: (message, options) => pushToast("info", message, options)
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <div className="toast-icon">
                <Icon size={18} />
              </div>
              <div className="toast-content">
                <p>{toast.message}</p>
                {toast.actionLabel && toast.onAction && (
                  <button
                    type="button"
                    className="toast-action"
                    onClick={() => {
                      toast.onAction();
                      removeToast(toast.id);
                    }}
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => removeToast(toast.id)}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
