import React, { useState } from "react";
import { ArrowLeft, UserCircle, BookOpen, Users, CalendarDays } from "lucide-react";
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

  // Toujours calculer ces valeurs (nécessaire pour useState avant tout return conditionnel)
  const selKey = route.page === "eval-select-ue" ? route.evaluatorKey : "";
  const ues: EvalConfig[] = configs.filter(cfg => evaluatorKey(cfg) === selKey);
  const allDates = [...new Set(
    ues.flatMap(cfg => (cfg.bddSchedule ?? []).map(e => e.date))
  )].sort();
  const today = new Date().toISOString().split("T")[0];
  const defaultDate = allDates.includes(today) ? today : (allDates[0] ?? "");
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  if (route.page === "eval-select-evaluator") {
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
      <PageShell title="Choix évaluateur" backRoute={{ page: "home" }} onNavigate={onNavigate}>
        {evaluators.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-12 text-center text-slate-400">
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
                className="group flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98]"
              >
                <UserCircle size={28} className="text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                <span className="text-sm font-black uppercase tracking-wide text-emerald-700 leading-tight">{ev.label}</span>
              </button>
            ))}
          </div>
        )}
      </PageShell>
    );
  }

  // Sélection de l'U.E. pour cet évaluateur
  const evalName = ues.length > 0 ? evaluatorLabel(ues[0]) : selKey;

  const filteredUes = selectedDate && allDates.length > 0
    ? ues.filter(cfg =>
        !cfg.bddSchedule ||
        cfg.bddSchedule.length === 0 ||
        cfg.bddSchedule.some(e => e.date === selectedDate)
      )
    : ues;

  return (
    <PageShell
      title={evalName}
      subtitle="Choisissez l'U.E. à évaluer"
      backRoute={{ page: "eval-select-evaluator" }}
      onNavigate={onNavigate}
    >
      {allDates.length > 1 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <CalendarDays size={12} /> Jour d'évaluation
          </p>
          <div className="flex flex-wrap gap-2">
            {allDates.map(d => {
              const label = new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    selectedDate === d
                      ? "bg-emerald-500 text-white shadow"
                      : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {filteredUes.map(cfg => {
          const done = cfg.savedEvaluations.length;
          const total = cfg.studentList.length;
          const allDone = total > 0 && done >= total;
          return (
            <button
              key={cfg.id}
              type="button"
              onClick={() => onNavigate({ page: "eval-run", evalId: cfg.id })}
              className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-all active:scale-[0.99] ${
                allDone
                  ? "border-slate-200 bg-slate-50 opacity-50 hover:opacity-70"
                  : "border-emerald-200 bg-white shadow-sm hover:border-emerald-400 hover:bg-emerald-50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${allDone ? "bg-slate-100 text-slate-300" : "bg-emerald-100 text-emerald-600"}`}>
                  <BookOpen size={26} strokeWidth={1.5} />
                </div>
                <div>
                  <div className={`text-xs font-black uppercase tracking-widest mb-0.5 ${allDone ? "text-slate-300" : "text-emerald-600"}`}>
                    {cfg.promotion}
                  </div>
                  <div className={`font-black uppercase tracking-wide text-base leading-tight ${allDone ? "text-slate-400" : "text-slate-800"}`}>
                    {cfg.ue || "U.E. sans nom"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users size={12} />
                  <span>{done}/{total}</span>
                </div>
                {allDone && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate(backRoute)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={15} /> Retour
        </button>
        <img src={logoDataUri} alt="Logo" className="h-8 w-auto opacity-70" />
        <div className="w-20" />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
