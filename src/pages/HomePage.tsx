import { ShieldCheck, ClipboardCheck } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute } from "../types";

interface Props {
  onNavigate: (route: AppRoute) => void;
}

export function HomePage({ onNavigate }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <img src={logoDataUri} alt="Logo IFSO" className="h-10 w-auto brightness-0 invert opacity-80" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          IFSO Vichy · Clermont-Ferrand
        </span>
      </header>

      {/* Main */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
            Grille d'évaluation pratique
          </h1>
          <p className="mt-2 text-sm text-white/40">Choisissez votre profil pour commencer</p>
        </div>

        <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row">
          {/* Admin */}
          <button
            type="button"
            onClick={() => onNavigate({ page: "admin-home" })}
            className="group flex flex-1 flex-col items-center gap-5 rounded-2xl border border-amber-400/20 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-amber-400/50 hover:bg-white/10 active:scale-[0.98]"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 transition-colors group-hover:bg-amber-400/20">
              <ShieldCheck size={40} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-base font-black uppercase tracking-wide text-amber-300">
                Administrateur
              </div>
              <div className="mt-1 text-xs text-white/40">
                Configurer, créer et gérer les évaluations
              </div>
            </div>
          </button>

          {/* Évaluateur */}
          <button
            type="button"
            onClick={() => onNavigate({ page: "eval-select-promo" })}
            className="group flex flex-1 flex-col items-center gap-5 rounded-2xl border border-emerald-400/20 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-emerald-400/50 hover:bg-white/10 active:scale-[0.98]"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400 transition-colors group-hover:bg-emerald-400/20">
              <ClipboardCheck size={40} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-base font-black uppercase tracking-wide text-emerald-300">
                Évaluateur
              </div>
              <div className="mt-1 text-xs text-white/40">
                Démarrer ou reprendre une évaluation
              </div>
            </div>
          </button>
        </div>
      </main>

      <footer className="py-4 text-center text-[10px] uppercase tracking-widest text-white/20">
        v0.3.0
      </footer>
    </div>
  );
}
