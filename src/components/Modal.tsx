import type { ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, showCloseButton = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {showCloseButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-full px-2 py-1 text-slate-500"
            >
              ✕
            </Button>
          )}
        </div>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}
