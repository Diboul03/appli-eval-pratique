import { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { BddPanel } from "../components/BddPanel";

interface Props {
  onNavigate: (route: AppRoute) => void;
}

export function BddSelectPage({ onNavigate }: Props) {
  const evalStore = useEvalStore();
  const { configs, promotionsAvailable } = evalStore;
  const [selectedPromo, setSelectedPromo] = useState<string>(promotionsAvailable[0] ?? "");
  const [selectedEvalId, setSelectedEvalId] = useState<string>("");
  const [testTrigger] = useState(0);

  const evalsForPromo = configs.filter(c => c.promotion === selectedPromo);
  const selectedConfig = configs.find(c => c.id === selectedEvalId);

  if (configs.length === 0) {
    return (
      <PageShell onNavigate={onNavigate}>
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
          <p>Aucune évaluation configurée.<br />Créez d'abord une évaluation en mode admin.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell onNavigate={onNavigate}>
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Promotion</label>
          <select
            value={selectedPromo}
            onChange={e => { setSelectedPromo(e.target.value); setSelectedEvalId(""); }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          >
            <option value="">— Choisir —</option>
            {promotionsAvailable.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Unité d'enseignement</label>
          <select
            value={selectedEvalId}
            onChange={e => setSelectedEvalId(e.target.value)}
            disabled={!selectedPromo}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">— Choisir —</option>
            {evalsForPromo.map(c => (
              <option key={c.id} value={c.id}>{c.ue || "U.E. sans nom"}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedConfig ? (
        <BddPanel
          studentList={selectedConfig.studentList}
          defaultExaminer={selectedConfig.defaultExaminer}
          examDurationMinutes={selectedConfig.examDurationMinutes}
          ue={selectedConfig.ue}
          promotion={selectedConfig.promotion}
          testTrigger={testTrigger}
          otherSchedules={configs
            .filter(c => c.id !== selectedConfig.id && c.promotion === selectedConfig.promotion && c.bddSchedule)
            .map(c => c.bddSchedule!)}
          onScheduleGenerated={schedule => evalStore.saveBddSchedule(selectedConfig.id, schedule)}
        />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
          <p>Sélectionnez une promotion et une U.E. pour créer la BDD</p>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children, onNavigate }: { children: React.ReactNode; onNavigate: (r: AppRoute) => void }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-800 px-6 py-3">
        <button
          type="button"
          onClick={() => onNavigate({ page: "admin-home" })}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          <ArrowLeft size={15} /> Admin
        </button>
        <div className="flex items-center gap-3">
          <img src={logoDataUri} alt="" className="h-7 w-auto brightness-0 invert opacity-70" />
          <span className="text-sm font-black uppercase tracking-wide text-white/70">Création BDD</span>
        </div>
        <div className="w-20" />
      </div>
      <div className="mx-auto max-w-4xl p-6">{children}</div>
    </div>
  );
}
