import { ShieldCheck, ClipboardCheck, Moon, Sun } from "lucide-react";
import { praxieLogoDataUri } from "../assets/praxie-logo";
import type { AppRoute } from "../types";
import { useDarkMode } from "../hooks/useDarkMode";

interface Props {
  onNavigate: (route: AppRoute) => void;
}

export function HomePage({ onNavigate }: Props) {
  const [dark, toggleDark] = useDarkMode();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <img src={praxieLogoDataUri} alt="Praxie" className="h-10 w-auto rounded-xl" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDark}
            title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            IFSO Vichy · Clermont-Ferrand
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <p className="text-sm text-slate-500">Choisissez votre profil pour commencer</p>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row items-center">
          {/* Admin — discret */}
          <button
            type="button"
            onClick={() => onNavigate({ page: "admin-home" })}
            className="group flex flex-col items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center transition-all hover:border-amber-300 hover:bg-amber-100 active:scale-[0.98]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-200">
              <ShieldCheck size={16} strokeWidth={1.5} />
            </div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Admin
            </div>
          </button>

          {/* Évaluateur — principal */}
          <button
            type="button"
            onClick={() => onNavigate({ page: "eval-select-evaluator" })}
            className="group flex flex-1 flex-col items-center gap-5 rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98]"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-200">
              <ClipboardCheck size={40} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-base font-black uppercase tracking-wide text-emerald-700">
                Évaluateur
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Démarrer ou reprendre une évaluation
              </div>
            </div>
          </button>
        </div>
      </main>

      <footer className="py-4 text-center text-[10px] uppercase tracking-widest text-slate-300">
        v0.7.1
      </footer>
    </div>
  );
}
