import { ArrowLeft, UserCircle, BookOpen, Users } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute, EvalConfig } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";

interface Props {
  route: { page: "eval-select-evaluator" } | { page: "eval-select-ue"; evaluatorKey: string };
  onNavigate: (route: AppRoute) => void;
}

function evaluatorKey(cfg: EvalConfig): string {
  return `${cfg.defaultExaminer.nom}||${cfg.defaultExaminer.prenom}`;
}

function evaluatorLabel(cfg: EvalConfig): string {
  return [cfg.defaultExaminer.prenom, cfg.defaultExaminer.nom].filter(Boolean).join(" ") || "—";
}

export function EvaluatorSelectPage({ route, onNavigate }: Props) {
  const { configs } = useEvalStore();

  if (route.page === "eval-select-evaluator") {
    // Dédoublonner les évaluateurs
    const seen = new Set<string>();
    const evaluators: { key: string; label: string }[] = [];
    for (const cfg of configs) {
      const key = evaluatorKey(cfg);
      if (!seen.has(key)) {
        seen.add(key);
        evaluators.push({ key, label: evaluatorLabel(cfg) });
      }
    }

    return (
      <PageShell title="Qui êtes-vous ?" backRoute={{ page: "home" }} onNavigate={onNavigate}>
        {evaluators.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/40">
            <UserCircle size={36} className="mx-auto mb-3 opacity-30" />
            <p>Aucune évaluation configurée.<br />Contactez un administrateur.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {evaluators.map(ev => (
              <button
                key={ev.key}
                type="button"
                onClick={() => onNavigate({ page: "eval-select-ue", evaluatorKey: ev.key })}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-emerald-400/20 bg-white/5 p-5 text-center backdrop-blur-sm transition-all hover:border-emerald-400/50 hover:bg-white/10 active:scale-[0.98]"
              >
                <UserCircle size={28} className="text-emerald-400/70 group-hover:text-emerald-300 transition-colors" />
                <span className="text-sm font-black uppercase tracking-wide text-emerald-300 leading-tight">{ev.label}</span>
              </button>
            ))}
          </div>
        )}
      </PageShell>
    );
  }

  // Sélection de l'U.E. pour cet évaluateur
  const { evaluatorKey: selKey } = route;
  const ues: EvalConfig[] = configs.filter(cfg => evaluatorKey(cfg) === selKey);
  const evalName = ues.length > 0 ? evaluatorLabel(ues[0]) : selKey;

  return (
    <PageShell
      title={evalName}
      subtitle="Choisissez l'U.E. à évaluer"
      backRoute={{ page: "eval-select-evaluator" }}
      onNavigate={onNavigate}
    >
      <div className="flex flex-col gap-3">
        {ues.map(cfg => {
          const done = cfg.savedEvaluations.length;
          const total = cfg.studentList.length;
          const allDone = total > 0 && done >= total;
          return (
            <button
              key={cfg.id}
              type="button"
              onClick={() => onNavigate({ page: "eval-run", evalId: cfg.id })}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-white/5 p-5 text-left backdrop-blur-sm transition-all active:scale-[0.99] ${
                allDone
                  ? "border-white/10 opacity-50 hover:opacity-70"
                  : "border-emerald-400/20 hover:border-emerald-400/50 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${allDone ? "bg-white/5 text-white/30" : "bg-emerald-400/10 text-emerald-400"}`}>
                  <BookOpen size={26} strokeWidth={1.5} />
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest mb-0.5 ${allDone ? "text-white/25" : "text-emerald-400"}`}>
                    {cfg.promotion}
                  </div>
                  <div className={`font-black uppercase tracking-wide text-base leading-tight ${allDone ? "text-white/40" : "text-white/90"}`}>
                    {cfg.ue || "U.E. sans nom"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs text-white/30">
                  <Users size={12} />
                  <span>{done}/{total}</span>
                </div>
                {allDone && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/30">
                    Terminé
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}

function PageShell({
  title, subtitle, backRoute, onNavigate, children,
}: {
  title: string;
  subtitle?: string;
  backRoute: AppRoute;
  onNavigate: (r: AppRoute) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-800">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate(backRoute)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <img src={logoDataUri} alt="Logo" className="h-8 w-auto brightness-0 invert opacity-70" />
        <div className="w-20" />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-black uppercase tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-white/40">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
