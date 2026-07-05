import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type ToastTone = "success" | "error";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface DialogsApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notify: (message: string, tone?: ToastTone) => void;
}

export const DialogsContext = createContext<DialogsApi | null>(null);

export function useDialogs(): DialogsApi {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs doit être utilisé dans <DialogProvider>");
  return ctx;
}
