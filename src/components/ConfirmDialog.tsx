import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-700 hover:bg-rose-800 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      default:
        return 'bg-emerald-800 hover:bg-emerald-900 text-white';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-stone-100 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-700'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="confirm-dialog-title" className="text-sm font-bold text-stone-900">
                {title}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Please confirm this action</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-stone-600 leading-relaxed">{message}</p>
        </div>

        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition ${getButtonClass()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
