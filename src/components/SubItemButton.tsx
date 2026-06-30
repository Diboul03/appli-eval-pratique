import type { LucideIcon } from "lucide-react";
import { Check, MinusCircle, XCircle } from "lucide-react";
import type { SubStatus } from "../types";

export interface SubItemButtonProps {
  status: SubStatus;
  targetStatus: SubStatus;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  colorClasses: string;
  tooltip?: string;
}

export const subItemConfigs: Record<
  Exclude<SubStatus, "">,
  {
    icon: LucideIcon;
    label: string;
    colorClasses: string;
    tooltip: string;
  }
> = {
  ACQUIS: {
    icon: Check,
    label: "Acquis",
    colorClasses:
      "bg-emerald-100 text-emerald-900 border-2 border-emerald-500 hover:bg-emerald-200",
    tooltip: "Conforme aux attendus",
  },
  EN_COURS: {
    icon: MinusCircle,
    label: "En cours d'acquisition",
    colorClasses:
      "bg-amber-100 text-amber-900 border-2 border-amber-500 hover:bg-amber-200",
    tooltip: "Partiellement maîtrisé",
  },
  NON_ACQUIS: {
    icon: XCircle,
    label: "Non acquis",
    colorClasses: "bg-red-100 text-red-900 border-2 border-red-500 hover:bg-red-200",
    tooltip: "En deçà des attendus",
  },
};

export function SubItemButton({
  status,
  targetStatus,
  onClick,
  icon: Icon,
  label,
  colorClasses,
  tooltip,
}: SubItemButtonProps) {
  const isActive = status === targetStatus;
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={tooltip ? `${label} – ${tooltip}` : label}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 ${
        isActive
          ? colorClasses
          : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}
