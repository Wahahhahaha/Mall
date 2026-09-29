import React, { useCallback, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps extends ConfirmOptions {
  busy?: boolean;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel}>
      <div className="confirm-body">
        <span className={`confirm-icon ${tone}`}>
          <AlertTriangle size={18} />
        </span>
        <div className="confirm-text">{message}</div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === 'danger' ? 'btn-danger' : 'btn-secondary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function useConfirm() {
  const [state, setState] = useState<{ options: ConfirmOptions; busy: boolean } | null>(null);

  const askConfirm = useCallback((options: ConfirmOptions) => {
    setState({ options, busy: false });
  }, []);

  const close = useCallback(() => setState(null), []);

  const confirm = useCallback(async () => {
    if (!state) return;
    setState((prev) => (prev ? { ...prev, busy: true } : prev));
    try {
      await state.options.onConfirm();
    } finally {
      setState(null);
    }
  }, [state]);

  const confirmDialog = state ? (
    <ConfirmDialog
      {...state.options}
      busy={state.busy}
      onConfirm={() => void confirm()}
      onCancel={close}
    />
  ) : null;

  return { askConfirm, confirmDialog };
}

export default ConfirmDialog;
