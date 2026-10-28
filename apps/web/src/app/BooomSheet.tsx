import { useEffect, ReactNode } from 'react';

export function BooomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overlay" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 theme-surface rounded-t-card max-h-[85vh] overflow-y-auto overflow-x-hidden sheet-panel">
        <div className="flex justify-center pt-2 pb-1 sticky top-0 theme-surface">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--t-border)' }} />
        </div>
        <div className="px-4 pb-6 pt-1">{children}</div>
      </div>
    </div>
  );
}
