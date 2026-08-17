import { useEffect } from 'react';

type PopupType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

interface PopupProps {
  open: boolean;
  type?: PopupType;
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function Popup({
  open,
  type = 'info',
  title,
  message,
  onClose,
  autoClose = false,
  autoCloseDelay = 3000,
}: PopupProps) {
  useEffect(() => {
    if (!open || !autoClose) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, autoCloseDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    open,
    autoClose,
    autoCloseDelay,
    onClose,
  ]);

  if (!open) return null;

  const styles = {
    success: {
      icon: '✓',
      iconClass:
        'bg-emerald-100 text-emerald-600',
      buttonClass:
        'bg-emerald-600 hover:bg-emerald-700',
    },

    error: {
      icon: '!',
      iconClass:
        'bg-rose-100 text-rose-600',
      buttonClass:
        'bg-rose-600 hover:bg-rose-700',
    },

    warning: {
      icon: '!',
      iconClass:
        'bg-amber-100 text-amber-600',
      buttonClass:
        'bg-amber-600 hover:bg-amber-700',
    },

    info: {
      icon: 'i',
      iconClass:
        'bg-blue-100 text-blue-600',
      buttonClass:
        'bg-blue-600 hover:bg-blue-700',
    },
  };

  const current = styles[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${current.iconClass}`}
          >
            {current.icon}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900">
              {title}
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-600">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close popup"
          >
            ×
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${current.buttonClass}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}