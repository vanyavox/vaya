import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const value = useMemo(() => confirm, [confirm]);
  const opts = pending?.options;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 overlay flex items-center justify-center z-[100] p-4"
          onClick={() => close(false)}
        >
          <div
            className="theme-surface rounded-card p-6 w-full max-w-sm"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">{opts.title}</h2>
            {opts.message && <p className="text-sm theme-muted mb-5">{opts.message}</p>}
            {!opts.message && <div className="mb-5" />}
            <div className="flex gap-3">
              <button type="button" onClick={() => close(false)} className="btn-secondary flex-1">
                {opts.cancelLabel ?? 'Отмена'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 ${opts.danger ? 'btn-danger' : 'btn-primary'}`}
              >
                {opts.confirmLabel ?? 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
