import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { DialogsContext } from "../hooks/useDialogs";
import type { DialogsApi, ConfirmOptions, ToastTone } from "../hooks/useDialogs";

export function DialogProvider({ children }: { children: ReactNode }) {
  // --- Toast ---
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  // --- Confirm ---
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    if (resolve) resolve(value);
  }, []);

  const api = useMemo<DialogsApi>(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <DialogsContext.Provider value={api}>
      {children}

      {toast && (
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                toast.tone === "error" ? "bg-red-500" : "bg-emerald-500"
              }`}
            >
              {toast.tone === "error" ? "!" : "✓"}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmState !== null}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title ?? "Confirmer"}
        showCloseButton={false}
      >
        {confirmState && (
          <>
            <div className="text-sm text-slate-600 whitespace-pre-line">{confirmState.message}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="neutral" onClick={() => closeConfirm(false)} className="rounded-xl py-2">
                {confirmState.cancelLabel ?? "Annuler"}
              </Button>
              <Button
                variant={confirmState.danger ? "danger" : "primary"}
                onClick={() => closeConfirm(true)}
                className="rounded-xl py-2"
                autoFocus
              >
                {confirmState.confirmLabel ?? "Confirmer"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </DialogsContext.Provider>
  );
}
