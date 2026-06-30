import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utils/cn";

type Variant = "primary" | "danger" | "warning" | "neutral" | "ghost" | "info";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Icône optionnelle affichée avant le libellé */
  icon?: ReactNode;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400",
  warning: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-400",
  info: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400",
  neutral: "bg-slate-200 text-slate-700 hover:bg-slate-300 focus-visible:ring-slate-400",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs gap-1",
  md: "px-3.5 py-2 text-sm gap-1.5",
  lg: "px-5 py-2.5 text-base gap-2",
};

/**
 * Bouton unifié de l'application : variantes de couleur, tailles et état
 * désactivé cohérents, avec un anneau de focus visible (accessibilité clavier).
 */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-60",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
