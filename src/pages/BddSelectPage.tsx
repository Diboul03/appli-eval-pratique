import React, { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { logoDataUri } from "../assets/logo";
import type { AppRoute, BddScheduleEntry, EvalConfig } from "../types";
import { useEvalStore } from "../hooks/useEvalStore";
import { BddPanel } from "../components/BddPanel";

interface Props {
  onNavigate: (route: AppRoute) => void;
  preselectedConfigId?: string;
}

export function BddSelectPage({ onNavigate, preselectedConfigId }: Props) {
  const evalStore = useEvalStore();
  const { configs, promotionsAvailable } = evalStore;
  const preselected = preselectedConfigId ? configs.find(c => c.id === preselectedConfigId) : undefined;
  const [selectedPromo, setSelectedPromo] = useState<string>(preselected?.promotion ?? promotionsAvailable[0] ?? "");
  const [selectedEvalId, setSelectedEvalId] = useState<string>(preselectedConfigId ?? "");
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
        <>
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
          {selectedConfig.bddSchedule && selectedConfig.bddSchedule.length > 0 && (
            <div className="mt-8">
              <BddTimeline
                schedule={selectedConfig.bddSchedule}
                savedEvaluations={selectedConfig.savedEvaluations}
                examDurationMinutes={selectedConfig.examDurationMinutes}
                allConfigs={configs.filter(c => c.promotion === selectedConfig.promotion)}
              />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays size={36} className="mx-auto mb-3 opacity-30" />
          <p>Sélectionnez une promotion et une U.E. pour créer la BDD</p>
        </div>
      )}
    </PageShell>
  );
}

function BddTimeline({
  schedule,
  savedEvaluations,
  examDurationMinutes,
  allConfigs,
}: {
  schedule: BddScheduleEntry[];
  savedEvaluations: import("../types").SavedEvaluation[];
  examDurationMinutes: number;
  allConfigs: EvalConfig[];
}) {
  const toMinutes = (heure: string) => {
    const [h, m] = heure.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const slots = [...schedule].sort((a, b) => toMinutes(a.heure) - toMinutes(b.heure));
  if (slots.length === 0) return null;

  const startMin = toMinutes(slots[0].heure);
  const endMin = toMinutes(slots[slots.length - 1].heure) + examDurationMinutes + 10;
  const totalSpan = endMin - startMin;
  const pct = (min: number) => `${((min - startMin) / totalSpan) * 100}%`;

  // Tick marks every 30 min
  const ticks: number[] = [];
  for (let m = Math.floor(startMin / 30) * 30; m <= endMin; m += 30) ticks.push(m);

  const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const isEvaluated = (entry: BddScheduleEntry) =>
    savedEvaluations.some(
      ev => ev.student.nom === entry.student.nom && ev.student.prenom === entry.student.prenom,
    );

  // Group by date
  const dates = [...new Set(slots.map(s => s.date))].sort();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
        <CalendarDays size={15} /> Timeline de passage
      </h3>

      {dates.map(date => {
        const daySlots = slots.filter(s => s.date === date);
        return (
          <div key={date} className="mb-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {new Date(date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {/* Axe temps */}
            <div className="relative mb-1 h-5">
              {ticks.map(t => (
                <span
                  key={t}
                  className="absolute -translate-x-1/2 text-[9px] text-slate-400"
                  style={{ left: pct(t) }}
                >
                  {fmtMin(t)}
                </span>
              ))}
            </div>

            {/* Ligne de fond */}
            <div className="relative mb-1 h-1 rounded-full bg-slate-100">
              {ticks.map(t => (
                <div
                  key={t}
                  className="absolute top-0 h-full w-px bg-slate-200"
                  style={{ left: pct(t) }}
                />
              ))}
            </div>

            {/* Barres étudiants */}
            <div className="space-y-1.5">
              {daySlots.map((entry, i) => {
                const st = toMinutes(entry.heure);
                const en = st + examDurationMinutes;
                const done = isEvaluated(entry);
                // Check conflicts from other UEs same promo same slot
                const conflict = allConfigs.some(cfg =>
                  cfg.id !== undefined &&
                  (cfg.bddSchedule ?? []).some(
                    other =>
                      other.student.nom === entry.student.nom &&
                      other.student.prenom === entry.student.prenom &&
                      other.date === entry.date &&
                      other.heure !== entry.heure &&
                      Math.abs(toMinutes(other.heure) - st) < examDurationMinutes,
                  ),
                );
                return (
                  <div key={i} className="relative h-7">
                    <div
                      className={`absolute flex h-full items-center overflow-hidden rounded-lg px-2 text-[11px] font-bold transition-all ${
                        conflict
                          ? "bg-orange-100 text-orange-800 border border-orange-300"
                          : done
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      }`}
                      style={{ left: pct(st), width: `calc(${pct(en)} - ${pct(st)})` }}
                      title={`${entry.student.nom} ${entry.student.prenom} — ${entry.heure}${conflict ? " ⚠ Conflit" : done ? " ✓ Évalué" : ""}`}
                    >
                      <span className="truncate">
                        {conflict && "⚠ "}
                        {done && "✓ "}
                        {entry.student.nom} {entry.student.prenom}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Légende */}
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-200 border border-indigo-300" />En attente</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />Évalué</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-orange-200 border border-orange-300" />Conflit horaire</span>
            </div>
          </div>
        );
      })}
    </div>
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
