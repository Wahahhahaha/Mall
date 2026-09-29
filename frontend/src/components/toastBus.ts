export interface ToastItem {
  id: number;
  message: string;
}

type Listener = (item: ToastItem) => void;

const listeners = new Set<Listener>();
let nextId = 0;

export function subscribeToToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toast(message: string) {
  const item: ToastItem = { id: (nextId += 1), message };
  listeners.forEach((listener) => listener(item));
}
