import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { subscribeToToasts } from './toastBus';
import type { ToastItem } from './toastBus';

const TOAST_DURATION = 3000;

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <span className="toast-message">{item.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Close notification"
      >
        <X size={13} />
      </button>
      <span className="toast-progress" style={{ animationDuration: `${TOAST_DURATION}ms` }} />
    </div>
  );
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToToasts((item) => setToasts((prev) => [...prev, item])), []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

export default ToastContainer;
